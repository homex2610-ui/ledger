export type AppTheme = 'light' | 'dark' | 'black';
export type AppTemplate = 'original' | 'ocean' | 'ember' | 'forest' | 'sunset' | 'midnight' | 'grape' | 'royal';

const THEME_KEY = 'pp-theme';
const TEMPLATE_KEY = 'pp-template';

export function getStoredTheme(): AppTheme {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === 'dark' || stored === 'black' ? stored : 'light';
}

export function applyTheme(theme: AppTheme): void {
  const root = document.documentElement;
  root.classList.remove('dark', 'black');
  if (theme !== 'light') root.classList.add(theme);
  localStorage.setItem(THEME_KEY, theme);
}

export function getStoredTemplate(): AppTemplate {
  const stored = localStorage.getItem(TEMPLATE_KEY);
  return stored === 'ocean' || stored === 'ember' || stored === 'forest' || stored === 'sunset' || stored === 'midnight' || stored === 'grape' || stored === 'royal' ? stored : 'original';
}

export function applyTemplate(template: AppTemplate): void {
  const root = document.documentElement;
  if (template === 'original') delete root.dataset.template;
  else root.dataset.template = template;
  localStorage.setItem(TEMPLATE_KEY, template);
}