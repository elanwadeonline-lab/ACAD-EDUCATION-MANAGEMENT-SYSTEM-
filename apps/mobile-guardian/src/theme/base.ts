import {createBaseTheme} from '../components/base-theme';
import {Colors as C} from './tokens';

export const guardianBaseTheme=createBaseTheme({scheme:'light'});
Object.assign(guardianBaseTheme.colors,{
  background:C.canvas,foreground:C.ink,card:C.card,cardForeground:C.ink,
  primary:C.primary,primaryForeground:'#FFFFFF',ring:C.primary,ringSoft:C.primaryTint,
  accent:C.primaryTint,accentForeground:C.primary,secondary:C.primaryLight,
  secondaryForeground:C.primary,border:C.cardBorder,muted:'#F0EFEC',mutedForeground:C.muted,
});
