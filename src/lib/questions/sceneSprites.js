// Raster cutouts derived from the same canonical illustration used by the
// study screen. The scene itself uses one background plate so it reads as a
// real place; the reconstruction tray uses these isolated, transparent props.

export const SCENE_BASE = '/images/scene/stage-base-integrated.png';
export const SCENE_MASTER = '/images/scene/master-integrated.png';

const ids = [
	'lamp',
	'postbox',
	'cat',
	'sign',
	'clock',
	'door',
	'mat',
	'window',
	'poster',
	'crate',
	'stop',
	'board',
	'bicycle',
	'meteor',
	'bus'
];

/** @type {Record<string, string>} */
export const PROP_SPRITES = Object.fromEntries(
	ids.map((id) => [
		id,
		['sign', 'door', 'crate', 'stop', 'board', 'bus', 'postbox'].includes(id)
			? `/images/scene/props-integrated/${id}.png`
			: `/images/scene/props/${id}.png`
	])
);
