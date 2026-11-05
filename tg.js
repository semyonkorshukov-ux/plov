// Связь страницы с Telegram. В обычном браузере ничего не меняет.
let tg = null;
let tgHomeMissed = false;
const tgSupports = version => !!tg && tg.isVersionAtLeast(version);
const tgTry = fn => { try { return fn(); } catch (e) { /* старая версия Telegram: страница работает и без этого */ } };

// Вибрация на подсказках и в конце шага срабатывает, даже если звук выключен.
const tgBellBase = bell;
bell = function (kind) {
  if (tgSupports('6.1')) {
    tgTry(() => {
      if (kind === 'end') tg.HapticFeedback.notificationOccurred('warning');
      else tg.HapticFeedback.impactOccurred('medium');
    });
  }
  tgBellBase(kind);
};

// Ход готовки дублируется в хранилище Telegram: система может очистить данные страницы.
const tgSaveBase = save;
save = function () {
  tgSaveBase();
  if (tgSupports('9.0')) tgTry(() => tg.DeviceStorage.setItem(KEY, JSON.stringify(S), () => {}));
};
function tgRestoreProgress() {
  if (!tgSupports('9.0')) return;
  let hasLocal = false;
  tgTry(() => { hasLocal = localStorage.getItem(KEY) !== null; });
  if (hasLocal) return;
  tgTry(() => tg.DeviceStorage.getItem(KEY, (err, value) => {
    if (err || !value) return;
    tgTry(() => localStorage.setItem(KEY, value));
    load();
    lastE = S.mode === 'cook' ? elapsedMs(Date.now()) / 1000 : 0;
    renderAll();
    keepAwake();
  }));
}

// Во время готовки Telegram переспросит, прежде чем закрыть приложение.
const tgRenderAllBase = renderAll;
renderAll = function () {
  tgRenderAllBase();
  if (!tg) return;
  if (tgSupports('6.2')) {
    tgTry(() => (S.mode === 'cook' ? tg.enableClosingConfirmation() : tg.disableClosingConfirmation()));
  }
  tgShowHomeButton();
};

function tgApplyTheme() {
  document.documentElement.dataset.theme = tg.colorScheme === 'dark' ? 'dark' : 'light';
  const ground = getComputedStyle(document.documentElement).getPropertyValue('--ground').trim();
  const surface = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim();
  if (tgSupports('6.1')) tgTry(() => { tg.setHeaderColor(ground); tg.setBackgroundColor(ground); });
  if (tgSupports('7.10')) tgTry(() => tg.setBottomBarColor(surface));
}

// Кнопка значка видна на стартовом экране, пока значка на главном экране нет.
function tgShowHomeButton() {
  const btn = document.getElementById('addHome');
  if (btn) btn.hidden = !(tgHomeMissed && S.mode === 'idle');
}
function tgSetupHomeButton() {
  if (!tgSupports('8.0')) return;
  const btn = document.createElement('button');
  btn.id = 'addHome';
  btn.type = 'button';
  btn.className = 'btn';
  btn.style.cssText = 'width:100%;margin-top:12px';
  btn.textContent = 'Добавить значок на главный экран';
  btn.hidden = true;
  btn.addEventListener('click', () => tgTry(() => tg.addToHomeScreen()));
  document.getElementById('now').appendChild(btn);
  tg.onEvent('homeScreenAdded', () => { tgHomeMissed = false; tgShowHomeButton(); });
  tgTry(() => tg.checkHomeScreenStatus(status => {
    tgHomeMissed = status === 'missed';
    tgShowHomeButton();
  }));
}

// Запускается, когда загрузился скрипт Telegram. Без него страница остаётся обычной.
function tgStart() {
  const app = window.Telegram && window.Telegram.WebApp;
  if (!app || !app.initData) return;
  tg = app;
  tgTry(() => tg.ready());
  tgTry(() => tg.expand());
  // Иначе приложение сворачивается, когда прокручиваешь страницу вниз жирными пальцами.
  if (tgSupports('7.7')) tgTry(() => tg.disableVerticalSwipes());
  tgApplyTheme();
  tgTry(() => tg.onEvent('themeChanged', tgApplyTheme));
  if (tgSupports('8.0')) {
    tgTry(() => tg.onEvent('activated', () => { keepAwake(); tick(); }));
  }
  tgSetupHomeButton();
  tgRestoreProgress();
  renderAll();
}
