import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Opens an endpoint (or a whole controller) to guests; everything else needs a login.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
