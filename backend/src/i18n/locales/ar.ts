import type { Translation } from './en.js';

// Arabic. Same keys as en.ts; a missing key fails the type check.
export const ar: Translation = {
  errors: {
    VALIDATION_ERROR: 'بعض الحقول غير صحيحة',
    INVALID_CURRENT_PASSWORD: 'كلمة المرور الحالية غير صحيحة',
    UNAUTHENTICATED: 'من فضلك سجّل الدخول',
    INVALID_CREDENTIALS: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    SESSION_EXPIRED: 'انتهت جلستك، من فضلك سجّل الدخول مرة أخرى',
    FORBIDDEN: 'ليس لديك صلاحية للقيام بذلك',
    ACCOUNT_BLOCKED: 'الحساب محظور',
    NOT_FOUND: 'غير موجود',
    EMAIL_TAKEN: 'البريد الإلكتروني مسجّل بالفعل',
    LINK_EXPIRED: 'انتهت صلاحية الرابط',
    FILE_TOO_LARGE: 'يجب ألا يزيد حجم الصورة عن 2 ميجابايت',
    UNSUPPORTED_FILE_TYPE: 'يجب أن تكون الصورة بصيغة JPG أو PNG',
    TOO_MANY_ATTEMPTS: 'محاولات فاشلة كثيرة. حاول مرة أخرى لاحقًا.',
    INTERNAL: 'حدث خطأ ما',
  },
  validation: {
    fullNameLength: 'يجب أن يكون الاسم الكامل بين 2 و100 حرف',
    emailInvalid: 'أدخل بريدًا إلكترونيًا صحيحًا',
    emailTooLong: 'البريد الإلكتروني طويل جدًا',
    emailRequired: 'البريد الإلكتروني مطلوب',
    passwordRequired: 'كلمة المرور مطلوبة',
    currentPasswordRequired: 'كلمة المرور الحالية مطلوبة',
    passwordRule: 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل وتحتوي على حرف ورقم',
    passwordsMismatch: 'كلمتا المرور غير متطابقتين',
    bioTooLong: 'يجب ألا تزيد النبذة عن 500 حرف',
    photoRequired: 'اختر صورة لرفعها',
    invalidJson: 'محتوى الطلب ليس JSON صحيحًا',
    languageInvalid: 'اختر إحدى اللغات المتاحة',
    unknownField: 'الحقل {{field}} غير مسموح به',
    invalidValue: 'هذه القيمة غير صحيحة',
  },
  messages: {
    resetLinkSent: 'إذا كان هناك حساب بهذا البريد الإلكتروني، فقد أرسلنا رابط إعادة التعيين.',
  },
};
