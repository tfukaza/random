// Fetches 128 plant photographs + licensing metadata from Wikimedia Commons
// and emits src/lib/plants.js and CREDITS.md.
//
//   node scripts/fetch-plants.mjs
//
// Committed so the asset set is reproducible. Idempotent: images already on
// disk are not re-downloaded, so a re-run only fills gaps.
//
// Wikimedia etiquette is ENFORCED, not advisory — an empty User-Agent gets a
// hard 403. Everything below is serial with a delay, uses a descriptive UA,
// and backs off on 429/503.
//
// Two API traps this script exists to encode (both verified against live
// endpoints, both silent failures):
//   1. `redirects=1` is mandatory. Without it, a species whose article lives
//      under another title (Dionaea muscipula → Venus flytrap) returns a page
//      object with no image and no error.
//   2. Never construct a thumbnail URL. `thumbwidth` echoes your request
//      rather than reality (asking 800 yields a 960px file) and hand-built
//      widths return HTTP 400. Only `thumburl` is real.

import { mkdir, writeFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SPECIES } from './species.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const IMG_DIR = join(ROOT, 'static/images/plants');
const TARGET = 128;
const THUMB_WIDTH = 500; // a real serving bucket; ~60–90 KB per image

const UA =
	'personality-quiz-plant-fetcher/1.0 (hobby project; contact: tomokifukazawa123@gmail.com) node-fetch';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Serial, polite, retrying fetch. */
async function api(url, { raw = false, tries = 4 } = {}) {
	for (let attempt = 1; attempt <= tries; attempt++) {
		const res = await fetch(url, { headers: { 'User-Agent': UA } });
		if (res.status === 429 || res.status === 503) {
			const wait = 2000 * attempt;
			console.warn(`  ${res.status} — backing off ${wait}ms`);
			await sleep(wait);
			continue;
		}
		if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
		await sleep(1100); // ~1 req/sec
		return raw ? Buffer.from(await res.arrayBuffer()) : res.json();
	}
	throw new Error(`gave up after ${tries} attempts: ${url}`);
}

/**
 * Commons `Artist`/`Credit` are HTML: protocol-relative links, entities,
 * <bdi> multi-author markup, stray non-breaking spaces. Reduce to plain text.
 */
function plainText(html) {
	if (!html) return '';
	return html
		.replace(/<[^>]*>/g, '')
		.replace(/&amp;/g, '&')
		.replace(/&quot;/g, '"')
		.replace(/&#0?39;|&apos;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&nbsp;| /g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

const slugify = (s) =>
	s
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

/** Step 1: resolve each species article to its lead image filename. */
async function leadImages(batch) {
	const url =
		'https://en.wikipedia.org/w/api.php?action=query&prop=pageimages' +
		'&piprop=original|name&redirects=1&format=json&formatversion=2&titles=' +
		encodeURIComponent(batch.map(([sci]) => sci).join('|'));
	const data = await api(url);

	// Walk normalization + redirect chains back to the title we asked for.
	const back = new Map();
	for (const n of data.query?.normalized ?? []) back.set(n.to, n.from);
	for (const r of data.query?.redirects ?? []) back.set(r.to, r.from);
	const originalOf = (title) => {
		let t = title;
		for (let i = 0; i < 5 && back.has(t); i++) t = back.get(t);
		return t;
	};

	const out = new Map();
	for (const page of data.query?.pages ?? []) {
		if (!page.pageimage) continue;
		out.set(originalOf(page.title), page.pageimage);
	}
	return out;
}

/** Step 2: licensing metadata + a real thumbnail URL for one Commons file. */
async function commonsFile(filename) {
	const url =
		'https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo' +
		'&iiprop=url|extmetadata|mime|size&iiurlwidth=' +
		THUMB_WIDTH +
		'&iiextmetadatafilter=License|LicenseShortName|LicenseUrl|Artist|Credit|AttributionRequired|UsageTerms|Attribution' +
		'&format=json&formatversion=2&titles=' +
		encodeURIComponent('File:' + filename);
	const data = await api(url);
	const page = data.query?.pages?.[0];
	const info = page?.imageinfo?.[0];
	if (!info) return null;
	const m = info.extmetadata ?? {};
	const val = (k) => m[k]?.value ?? '';
	return {
		thumburl: info.thumburl || info.url,
		mime: info.mime,
		descriptionurl: info.descriptionurl,
		license: plainText(val('LicenseShortName')),
		licenseId: plainText(val('License')).toLowerCase(),
		licenseUrl: plainText(val('LicenseUrl')),
		// Precedence: the uploader's preferred string, else author, else credit.
		artist:
			plainText(val('Attribution')) ||
			plainText(val('Artist')) ||
			plainText(val('Credit')) ||
			'Unknown author'
	};
}

/** Commons is all-free, but verify rather than assume. */
const isFree = (id) => /^(cc|pd|public)/.test(id) || id === 'cc0';

async function main() {
	await mkdir(IMG_DIR, { recursive: true });

	console.log(`Resolving ${SPECIES.length} species → lead images…`);
	const resolved = new Map();
	for (let i = 0; i < SPECIES.length; i += 50) {
		const batch = SPECIES.slice(i, i + 50);
		const found = await leadImages(batch);
		for (const [k, v] of found) resolved.set(k, v);
		console.log(`  batch ${i / 50 + 1}: ${found.size}/${batch.length} resolved`);
	}

	const kept = [];
	const seenFiles = new Set();
	const skipped = [];

	for (const [scientific, common] of SPECIES) {
		if (kept.length >= TARGET) break;
		const filename = resolved.get(scientific);
		if (!filename) {
			skipped.push([scientific, 'no lead image']);
			continue;
		}
		// Distinct species occasionally share an article (and therefore a photo).
		if (seenFiles.has(filename)) {
			skipped.push([scientific, 'duplicate image']);
			continue;
		}

		let meta;
		try {
			meta = await commonsFile(filename);
		} catch (err) {
			skipped.push([scientific, `metadata error: ${err.message}`]);
			continue;
		}
		if (!meta) {
			skipped.push([scientific, 'no imageinfo']);
			continue;
		}
		if (!isFree(meta.licenseId)) {
			skipped.push([scientific, `non-free license: ${meta.licenseId || 'unknown'}`]);
			continue;
		}
		if (!/^image\/(jpeg|png|webp)$/.test(meta.mime)) {
			skipped.push([scientific, `unsupported mime: ${meta.mime}`]);
			continue;
		}

		const ext = meta.mime === 'image/png' ? 'png' : meta.mime === 'image/webp' ? 'webp' : 'jpg';
		const file = `${slugify(scientific)}.${ext}`;
		const dest = join(IMG_DIR, file);

		if (!existsSync(dest)) {
			try {
				const bytes = await api(meta.thumburl, { raw: true });
				await writeFile(dest, bytes);
			} catch (err) {
				skipped.push([scientific, `download failed: ${err.message}`]);
				continue;
			}
		}

		seenFiles.add(filename);
		kept.push({
			common,
			scientific,
			file: `/images/plants/${file}`,
			artist: meta.artist,
			license: meta.license || 'See source',
			licenseUrl: meta.licenseUrl, // PD files omit this entirely
			sourceUrl: meta.descriptionurl
		});
		console.log(`  [${kept.length}/${TARGET}] ${scientific} — ${meta.license}`);
	}

	if (kept.length < TARGET) {
		console.error(
			`\nOnly ${kept.length}/${TARGET} plants resolved. Add more candidates to scripts/species.mjs and re-run.`
		);
	}

	// ---- src/lib/plants.js -------------------------------------------------
	const module = `// GENERATED by scripts/fetch-plants.mjs — do not edit by hand.
//
// ${kept.length} plant photographs from Wikimedia Commons, each stored
// UNMODIFIED (display sizing is CSS only, so no derivative is distributed and
// the ShareAlike term on the CC BY-SA images is never triggered).
//
// Every entry carries the attribution its license requires: author, license
// name, license URL where one exists, and a link to the Commons file page.
// Full list also mirrored in CREDITS.md at the repo root.
//
// ORDER IS THE MAPPING. plantFor() in personalities.js indexes this array by
// the 7-bit type code, so reordering this list re-rolls every assignment.

/**
 * @typedef {{ common: string, scientific: string, file: string,
 *   artist: string, license: string, licenseUrl: string, sourceUrl: string }} Plant
 */

/** @type {Plant[]} */
export const PLANTS = ${JSON.stringify(kept, null, '\t')};
`;
	await writeFile(join(ROOT, 'src/lib/plants.js'), module);

	// ---- CREDITS.md --------------------------------------------------------
	const credits = `# Image credits

The plant photographs shown on the result card come from **[Wikimedia Commons](https://commons.wikimedia.org/)**.
Each is stored unmodified; only display size is changed via CSS.

Licenses vary per image — most are Creative Commons Attribution-ShareAlike at
various versions, some are public domain. The author, license, and a link to
the original file page are listed for every image below, and the same credit
is shown beneath the photograph wherever it appears in the app.

| Species | Photographer / author | License | Source |
| --- | --- | --- | --- |
${kept
	.map(
		(p) =>
			`| _${p.scientific}_ | ${p.artist.replace(/\|/g, '\\|')} | ${
				p.licenseUrl ? `[${p.license}](${p.licenseUrl})` : p.license
			} | [Commons file page](${p.sourceUrl}) |`
	)
	.join('\n')}
`;
	await writeFile(join(ROOT, 'CREDITS.md'), credits);

	// ---- report ------------------------------------------------------------
	let bytes = 0;
	for (const f of await readdir(IMG_DIR)) bytes += (await stat(join(IMG_DIR, f))).size;

	console.log(`\nWrote src/lib/plants.js (${kept.length} plants) and CREDITS.md`);
	console.log(`Images: ${(bytes / 1024 / 1024).toFixed(1)} MB in static/images/plants/`);
	const licenses = {};
	for (const p of kept) licenses[p.license] = (licenses[p.license] ?? 0) + 1;
	console.log('Licenses:', licenses);
	if (skipped.length) {
		console.log(`\nSkipped ${skipped.length}:`);
		for (const [s, why] of skipped.slice(0, 40)) console.log(`  ${s} — ${why}`);
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
