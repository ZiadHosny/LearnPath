import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { I18nService } from './i18n.service';

// Tells the API which language to answer in (error and validation messages).
export const languageInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/')) return next(req);
  const language = inject(I18nService).language();
  return next(req.clone({ setHeaders: { 'Accept-Language': language } }));
};
