<script>
	// Q21 — reply to an obvious scam text using only the suggestion bar.
	// See ChatPick for the machinery.
	import ChatPick from './ChatPick.svelte';
	let { onAnswer, qNumber } = $props();

	const title = $derived(`Question ${qNumber}`);
	const sender = '+1 (830) 555-0187';
	const messages = [
		"Hey, you haven't paid. You have a missed payment for a recent credit card. Please send your bank account number ASAP to this email:",
		'secure.billing-dept@credlt-card-verify0.biz.co'
	];
	const options = [
		{ label: 'Let me respond ASAP', score: { connector: 3 } },
		{ label: 'Screw off, scammer', score: { adventurer: 2, sage: 1 } }
	];
</script>

<ChatPick {title} {sender} {messages} {options} {onAnswer} />
