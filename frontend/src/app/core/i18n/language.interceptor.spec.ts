import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { I18nService } from './i18n.service';
import { languageInterceptor } from './language.interceptor';

describe('languageInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    localStorage.removeItem('lp_language');
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([languageInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    backend.verify();
    localStorage.removeItem('lp_language');
  });

  it('US-30 S8: sends the current language to the API', async () => {
    http.get('/api/users/me').subscribe();
    expect(backend.expectOne('/api/users/me').request.headers.get('Accept-Language')).toBe('en');

    await TestBed.inject(I18nService).use('ar');
    http.get('/api/users/me').subscribe();
    expect(backend.expectOne('/api/users/me').request.headers.get('Accept-Language')).toBe('ar');
  });

  it('leaves other URLs alone', () => {
    http.get('https://fonts.example.com/x.css').subscribe();
    expect(backend.expectOne('https://fonts.example.com/x.css').request.headers.has('Accept-Language')).toBe(false);
  });
});
