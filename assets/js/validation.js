/* ==========================================================================
   GreenBasket – validation.js
   Accessible client-side validation for every <form data-validate>.
   - Uses native constraints (required, type, pattern, minlength, min/max)
     plus data-match="#otherField" for confirmations.
   - Custom messages: data-msg="..." on the field (optional).
   - On success the form receives a "gb:valid" CustomEvent; page scripts
     listen for it. Simple demo handlers live at the bottom of this file
     (data-form="newsletter|contact|login|register|review|forgot|admin-login").
   Client-side checks are for UX only – always validate again on the server.
   ========================================================================== */
(function () {
  'use strict';
  const GB = (window.GB = window.GB || {});

  const defaults = {
    valueMissing: (f) => (f.type === 'checkbox' ? 'Please tick this box to continue.' : f.type === 'radio' ? 'Please choose an option.' : `Please enter your ${label(f)}.`),
    typeMismatch: (f) => (f.type === 'email' ? 'Please enter a valid email address (e.g. name@example.com).' : `Please enter a valid ${label(f)}.`),
    patternMismatch: (f) => (f.type === 'tel' ? 'Please enter a valid 10-digit phone number.' : `Please check the format of your ${label(f)}.`),
    tooShort: (f) => `Must be at least ${f.minLength} characters.`,
    rangeUnderflow: (f) => `Must be at least ${f.min}.`,
    rangeOverflow: (f) => `Must be ${f.max} or less.`,
    mismatch: () => 'The values do not match.'
  };
  function label(f) {
    const l = f.id && document.querySelector(`label[for="${f.id}"]`);
    return (l ? l.textContent : f.name || 'value').replace('*', '').trim().toLowerCase();
  }

  function feedbackEl(field) {
    const id = (field.id || field.name) + '-error';
    let fb = document.getElementById(id);
    if (!fb) {
      fb = document.createElement('div');
      fb.className = 'invalid-feedback';
      fb.id = id;
      const anchor = field.closest('.input-group, .input-icon, .form-check, .option-group, .newsletter-form') || field;
      if (anchor.classList.contains('form-check')) anchor.appendChild(fb);
      else if (anchor.classList.contains('newsletter-form')) anchor.appendChild(fb);
      else anchor.insertAdjacentElement('afterend', fb);
    }
    const ids = new Set((field.getAttribute('aria-describedby') || '').split(' ').filter(Boolean));
    ids.add(id);
    field.setAttribute('aria-describedby', [...ids].join(' '));
    return fb;
  }

  /** Validate one field; returns true if valid. */
  GB.validateField = (field) => {
    if (field.disabled || field.type === 'hidden' || field.type === 'submit' || field.type === 'button') return true;
    field.setCustomValidity('');
    if (field.dataset.match) {
      const other = document.querySelector(field.dataset.match);
      if (other && field.value && field.value !== other.value) field.setCustomValidity('mismatch');
    }
    if (field.required && typeof field.value === 'string' && field.type !== 'checkbox' && field.type !== 'radio' && !field.value.trim()) {
      field.setCustomValidity('empty');
    }
    const v = field.validity;
    let msg = '';
    if (!v.valid) {
      if (v.customError && field.validationMessage === 'mismatch') msg = field.dataset.msgMatch || defaults.mismatch(field);
      else if (v.valueMissing || (v.customError && field.validationMessage === 'empty')) msg = field.dataset.msg || defaults.valueMissing(field);
      else if (v.typeMismatch) msg = field.dataset.msgFormat || defaults.typeMismatch(field);
      else if (v.patternMismatch) msg = field.dataset.msgFormat || defaults.patternMismatch(field);
      else if (v.tooShort) msg = defaults.tooShort(field);
      else if (v.rangeUnderflow) msg = defaults.rangeUnderflow(field);
      else if (v.rangeOverflow) msg = defaults.rangeOverflow(field);
      else msg = field.dataset.msg || 'Please check this field.';
    }
    const group = field.type === 'radio' ? GB.qsa(`[name="${field.name}"]`, field.form) : [field];
    group.forEach((f) => {
      f.classList.toggle('is-invalid', !!msg);
      f.classList.toggle('is-valid', !msg && field.form && field.form.dataset.showValid === 'true');
      f.setAttribute('aria-invalid', msg ? 'true' : 'false');
    });
    const fb = feedbackEl(group[group.length - 1]);
    fb.textContent = msg;
    fb.style.display = msg ? 'block' : '';
    return !msg;
  };

  /** Validate a whole form; focuses the first invalid field. */
  GB.validateForm = (form) => {
    const fields = GB.qsa('input, select, textarea', form).filter((f) => f.willValidate || f.required || f.dataset.match);
    const seenRadio = new Set();
    let firstInvalid = null;
    fields.forEach((f) => {
      if (f.type === 'radio') { if (seenRadio.has(f.name)) return; seenRadio.add(f.name); }
      if (!GB.validateField(f) && !firstInvalid) firstInvalid = f;
    });
    const summary = form.querySelector('[data-form-error]');
    if (summary) {
      summary.hidden = !firstInvalid;
      summary.textContent = firstInvalid ? 'Please fix the highlighted fields and try again.' : '';
    }
    if (firstInvalid) firstInvalid.focus({ preventScroll: false });
    return !firstInvalid;
  };

  function bind(form) {
    if (form.dataset.bound) return;
    form.dataset.bound = '1';
    form.setAttribute('novalidate', '');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      form.dataset.submitted = '1';
      if (GB.validateForm(form)) form.dispatchEvent(new CustomEvent('gb:valid', { bubbles: true }));
    });
    // Re-validate as the user corrects fields (after first submit attempt)
    const recheck = (e) => {
      if (!form.dataset.submitted || !e.target.matches('input, select, textarea')) return;
      GB.validateField(e.target);
      const summary = form.querySelector('[data-form-error]');
      if (summary && !form.querySelector('.is-invalid')) summary.hidden = true; // all fixed → hide the error summary
    };
    form.addEventListener('input', recheck);
    form.addEventListener('change', recheck);
    form.addEventListener('focusout', (e) => { if (e.target.matches('input, select, textarea') && e.target.value) GB.validateField(e.target); });
  }
  GB.bindForms = (ctx = document) => GB.qsa('form[data-validate]', ctx).forEach(bind);

  /* ---------- Password visibility + strength ---------------------------- */
  function initPasswordUi() {
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-password-toggle]');
      if (!b) return;
      const input = document.querySelector(b.dataset.passwordToggle);
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      b.setAttribute('aria-pressed', show ? 'true' : 'false');
      b.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      b.querySelector('i').className = 'bi ' + (show ? 'bi-eye-slash' : 'bi-eye');
    });
    GB.qsa('[data-strength-for]').forEach((meter) => {
      const input = document.querySelector(meter.dataset.strengthFor);
      const bar = meter.querySelector('span');
      const text = document.querySelector(meter.dataset.strengthText);
      input.addEventListener('input', () => {
        const v = input.value;
        let s = 0;
        if (v.length >= 8) s++;
        if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
        if (/\d/.test(v)) s++;
        if (/[^A-Za-z0-9]/.test(v)) s++;
        const levels = [['0%', 'transparent', ''], ['25%', '#111111', 'Weak'], ['50%', '#8a8a8a', 'Fair'], ['75%', '#5fba76', 'Good'], ['100%', '#2f9e4a', 'Strong']];
        const [w, c, t] = levels[v ? Math.max(1, s) : 0];
        bar.style.width = w; bar.style.background = c;
        if (text) text.textContent = t ? `Password strength: ${t}` : '';
      });
    });
  }

  /* ---------- Demo form handlers ---------------------------------------- */
  function showSuccess(form, html) {
    let box = form.parentElement.querySelector('[data-form-success]');
    if (!box) {
      box = document.createElement('div');
      box.className = 'alert alert-success mt-3';
      box.setAttribute('data-form-success', '');
      box.setAttribute('role', 'status');
      form.insertAdjacentElement('afterend', box);
    }
    box.hidden = false;
    box.innerHTML = html;
    box.focus && box.setAttribute('tabindex', '-1');
    box.focus();
  }

  const handlers = {
    newsletter(form) {
      // Connect to Mailchimp / Brevo / your API here.
      GB.toast('Thanks for subscribing! (Demo: no email was sent.)');
      form.reset();
      GB.qsa('.is-valid', form).forEach((f) => f.classList.remove('is-valid'));
    },
    contact(form) {
      // Replace with fetch('https://formspree.io/f/yourId', { method:'POST', body:new FormData(form) })
      showSuccess(form, '<i class="bi bi-check-circle-fill" aria-hidden="true"></i> <strong>Thank you!</strong> Your message is ready to send. <span class="d-block small mt-1">Demo mode: connect a form service (Formspree, Netlify Forms or your API) so messages reach your inbox.</span>');
      form.reset();
    },
    review(form) {
      showSuccess(form, '<i class="bi bi-check-circle-fill" aria-hidden="true"></i> Thanks for your review! <span class="small">(Demo: reviews are stored on your server once connected.)</span>');
      form.reset();
    },
    forgot(form) {
      GB.toast('If an account exists, a reset link will be emailed. (Demo – requires backend.)', 'info');
      form.reset();
      const m = form.closest('.modal');
      if (m && window.bootstrap) bootstrap.Modal.getOrCreateInstance(m).hide();
    },
    login(form) {
      // DEMO ONLY: no password is checked. Replace with POST /api/auth/login.
      const id = form.elements.identifier.value.trim();
      const prev = GB.store.get('user') || {};
      const isEmail = id.includes('@');
      GB.store.set('user', { name: prev.name || (isEmail ? id.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Valued Customer'), email: isEmail ? id : prev.email || '', phone: isEmail ? prev.phone || '' : id, loggedIn: true });
      GB.toast('Signed in (demo session)');
      setTimeout(() => { location.href = form.dataset.redirect || 'customer/dashboard.html'; }, 600);
    },
    register(form) {
      // DEMO ONLY: replace with POST /api/auth/register – never store passwords client-side.
      const f = form.elements;
      GB.store.set('user', { name: f.fullName.value.trim(), email: f.email.value.trim(), phone: f.phone.value.trim(), plan: new URLSearchParams(location.search).get('plan') || 'basic', loggedIn: true });
      GB.toast('Account created (demo)');
      setTimeout(() => { location.href = form.dataset.redirect || 'customer/dashboard.html'; }, 600);
    },
    'admin-login'(form) {
      // DEMO credentials only – real admin auth must happen on the server.
      const ok = form.elements.email.value.trim().toLowerCase() === 'admin@greenbasket.demo' && form.elements.password.value === 'admin123';
      const err = form.querySelector('[data-form-error]');
      if (!ok) { err.hidden = false; err.textContent = 'Incorrect demo credentials. Use admin@greenbasket.demo / admin123.'; return; }
      GB.store.set('admin', { email: form.elements.email.value.trim(), at: Date.now() });
      location.href = 'dashboard.html';
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    GB.bindForms();
    initPasswordUi();
    document.addEventListener('gb:valid', (e) => {
      const form = e.target;
      const h = handlers[form.dataset.form];
      if (h) h(form);
    });
  });
})();
