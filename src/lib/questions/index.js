// The ordered list of question components. Each is fully self-contained and
// only shares the { onAnswer(delta) } contract with the orchestrator — so to
// add a question, build a new .svelte component any way you like and drop it
// into this array. No shared schema, no config engine.
import Q1Party from './Q1Party.svelte';
import Q2Decision from './Q2Decision.svelte';
import Q3Recharge from './Q3Recharge.svelte';
import Q4RoughDay from './Q4RoughDay.svelte';
import Q5Income from './Q5Income.svelte';
import Q6Dinner from './Q6Dinner.svelte';
import Q7Coupon from './Q7Coupon.svelte';
import Q8Product from './Q8Product.svelte';
import Q9OneMeal from './Q9OneMeal.svelte';
import Q10Floor from './Q10Floor.svelte';
import Q11Fire from './Q11Fire.svelte';
import Q12Cheer from './Q12Cheer.svelte';
import Q13Elderly from './Q13Elderly.svelte';
import Q14Argument from './Q14Argument.svelte';
import Q15Dinner from './Q15Dinner.svelte';
import Q16Font from './Q16Font.svelte';
import Q17Palette from './Q17Palette.svelte';
import Q18Button from './Q18Button.svelte';
import Q19Wallpaper from './Q19Wallpaper.svelte';
import Q20Artistic from './Q20Artistic.svelte';
import Q21GroupChat from './Q21GroupChat.svelte';
import Q22Illusion from './Q22Illusion.svelte';
import Q23Permission from './Q23Permission.svelte';
import Q24Residence from './Q24Residence.svelte';
import Q25Alphabet from './Q25Alphabet.svelte';
import Q26Backpack from './Q26Backpack.svelte';
import Q27Survivor from './Q27Survivor.svelte';
import Q28Alignment from './Q28Alignment.svelte';
import Q29Patience from './Q29Patience.svelte';
import Q30Media from './Q30Media.svelte';
import Q31Noise from './Q31Noise.svelte';

export const questions = [
	Q1Party,
	Q2Decision,
	Q3Recharge,
	Q4RoughDay,
	Q5Income,
	Q6Dinner,
	Q7Coupon,
	Q8Product,
	Q9OneMeal,
	Q10Floor,
	Q11Fire,
	Q12Cheer,
	Q13Elderly,
	Q14Argument,
	Q15Dinner,
	Q16Font,
	Q17Palette,
	Q18Button,
	Q19Wallpaper,
	Q20Artistic,
	Q21GroupChat,
	Q22Illusion,
	Q23Permission,
	Q24Residence,
	Q25Alphabet,
	Q26Backpack,
	Q27Survivor,
	Q28Alignment,
	Q29Patience,
	Q30Media,
	Q31Noise
];
