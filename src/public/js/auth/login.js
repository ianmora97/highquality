/**
 * Auth components for Alpine.js
 * Defined as global factory functions so Alpine can use them via x-data="staffLogin()" etc.
 *
 * staffLogin()    — admin / su login (POST /dashboard/login)
 * clientLogin()   — client login by phone (POST /api/v1/auth/client/login)
 * clientRegister()— client registration (POST /api/v1/auth/client/register)
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strip non-digit characters */
function digitsOnly(v) { return String(v).replace(/\D/g, ''); }

/** Redirect after a brief success flash */
function redirectAfterSuccess(url, delay) {
    delay = delay || 700;
    setTimeout(function() { window.location.href = url; }, delay);
}

// ─── Staff Login ──────────────────────────────────────────────────────────────
function staffLogin() {
    return {
        form:       { identifier: '', password: '' },
        errors:     { identifier: '', password: '' },
        focusField: null,
        showPwd:    false,
        loading:    false,
        success:    false,
        shake:      false,
        error:      '',

        validateIdentifier: function() {
            var v = this.form.identifier.trim();
            this.errors.identifier = v ? '' : 'Este campo es requerido';
        },
        validatePassword: function() {
            this.errors.password = this.form.password ? '' : 'Este campo es requerido';
        },
        isValid: function() {
            return !this.errors.identifier && !this.errors.password
                && this.form.identifier.trim() && this.form.password;
        },

        submit: async function() {
            this.validateIdentifier();
            this.validatePassword();
            this.error = '';
            if (!this.isValid()) { this.shake = true; return; }

            this.loading = true;
            try {
                var res = await axios.post('/dashboard/login', {
                    identifier: this.form.identifier.trim(),
                    password:   this.form.password,
                });
                this.success = true;
                redirectAfterSuccess(res.data.redirect || '/dashboard/panel');
            } catch (e) {
                this.error   = (e.response && e.response.data && e.response.data.error)
                    ? e.response.data.error
                    : 'Error al ingresar. Inténtalo de nuevo.';
                this.shake   = true;
                this.loading = false;
            }
        },
    };
}

// ─── Client Login ─────────────────────────────────────────────────────────────
function clientLogin() {
    return {
        form:       { phone: '', password: '' },
        errors:     { phone: '', password: '' },
        focusField: null,
        showPwd:    false,
        loading:    false,
        success:    false,
        shake:      false,
        error:      '',

        /** Alpine init() — called when the component initialises */
        init: function() {
            // Phone field is handled via syncPhone() instead of IMask
            // to keep Alpine x-model reactive
        },

        /** Keep form.phone in sync from raw input events (strips non-digits) */
        syncPhone: function(event) {
            var digits = digitsOnly(event.target.value).slice(0, 8);
            event.target.value = digits;   // keep the DOM value clean
            this.form.phone = digits;
        },

        validatePhone: function() {
            var v = digitsOnly(this.form.phone);
            if (!v)           this.errors.phone = 'Ingresa tu número de teléfono';
            else if (v.length !== 8) this.errors.phone = 'El número debe tener exactamente 8 dígitos';
            else              this.errors.phone = '';
        },
        validatePassword: function() {
            this.errors.password = this.form.password ? '' : 'Ingresa tu contraseña';
        },
        isValid: function() {
            return !this.errors.phone && !this.errors.password
                && digitsOnly(this.form.phone).length === 8
                && this.form.password;
        },

        submit: async function() {
            this.validatePhone();
            this.validatePassword();
            this.error = '';
            if (!this.isValid()) { this.shake = true; return; }

            this.loading = true;
            try {
                await axios.post('/api/v1/auth/client/login', {
                    phone:    digitsOnly(this.form.phone),
                    password: this.form.password,
                });
                this.success = true;
                var redirect = new URLSearchParams(window.location.search).get('redirect') || '/app';
                redirectAfterSuccess(redirect);
            } catch (e) {
                this.error   = (e.response && e.response.data && e.response.data.error)
                    ? e.response.data.error
                    : 'Error al ingresar. Inténtalo de nuevo.';
                this.shake   = true;
                this.loading = false;
            }
        },
    };
}

// ─── Client Register ──────────────────────────────────────────────────────────
function clientRegister() {
    return {
        form:        { name: '', phone: '', password: '', confirm: '' },
        errors:      { name: '', phone: '', password: '', confirm: '' },
        focusField:  null,
        showPwd:     false,
        showConfirm: false,
        loading:     false,
        success:     false,
        shake:       false,
        error:       '',
        strength:    0,   // 0-4

        get strengthColor() {
            return ['bg-white/[.08]', 'bg-danger', 'bg-warning', 'bg-gold', 'bg-success'][this.strength] || 'bg-white/[.08]';
        },
        get strengthTextColor() {
            return ['text-gray-600', 'text-danger', 'text-warning', 'text-gold', 'text-success'][this.strength] || 'text-gray-600';
        },
        get strengthLabel() {
            return ['', 'Débil', 'Regular', 'Buena', 'Fuerte'][this.strength] || '';
        },

        calcStrength: function(pwd) {
            if (!pwd) return 0;
            var score = 0;
            if (pwd.length >= 8)           score++;
            if (pwd.length >= 12)          score++;
            if (/[A-Z]/.test(pwd))         score++;
            if (/[0-9]/.test(pwd))         score++;
            if (/[^A-Za-z0-9]/.test(pwd))  score++;
            return Math.min(score, 4);
        },

        syncPhone: function(event) {
            var digits = digitsOnly(event.target.value).slice(0, 8);
            event.target.value = digits;
            this.form.phone = digits;
        },

        validateName: function() {
            var v = this.form.name.trim();
            if (!v)         this.errors.name = 'Ingresa tu nombre';
            else if (v.length < 2) this.errors.name = 'El nombre es demasiado corto';
            else            this.errors.name = '';
        },
        validatePhone: function() {
            var v = digitsOnly(this.form.phone);
            if (!v)              this.errors.phone = 'Ingresa tu número de teléfono';
            else if (v.length !== 8) this.errors.phone = 'El número debe tener exactamente 8 dígitos';
            else                 this.errors.phone = '';
        },
        validatePassword: function() {
            var p = this.form.password;
            this.strength = this.calcStrength(p);
            if (!p)           this.errors.password = 'Ingresa una contraseña';
            else if (p.length < 8) this.errors.password = 'Mínimo 8 caracteres';
            else              this.errors.password = '';
            // Re-validate confirm if already typed
            if (this.form.confirm) this.validateConfirm();
        },
        validateConfirm: function() {
            if (!this.form.confirm)                        this.errors.confirm = 'Confirma tu contraseña';
            else if (this.form.confirm !== this.form.password) this.errors.confirm = 'Las contraseñas no coinciden';
            else                                               this.errors.confirm = '';
        },

        isValid: function() {
            return !this.errors.name && !this.errors.phone && !this.errors.password && !this.errors.confirm
                && this.form.name.trim()
                && digitsOnly(this.form.phone).length === 8
                && this.form.password.length >= 8
                && this.form.confirm === this.form.password;
        },

        submit: async function() {
            this.validateName();
            this.validatePhone();
            this.validatePassword();
            this.validateConfirm();
            this.error = '';
            if (!this.isValid()) { this.shake = true; return; }

            this.loading = true;
            try {
                await axios.post('/api/v1/auth/client/register', {
                    name:     this.form.name.trim(),
                    phone:    digitsOnly(this.form.phone),
                    password: this.form.password,
                });
                this.success = true;
                var redirect = new URLSearchParams(window.location.search).get('redirect') || '/app';
                redirectAfterSuccess(redirect);
            } catch (e) {
                this.error   = (e.response && e.response.data && e.response.data.error)
                    ? e.response.data.error
                    : 'Error al crear la cuenta. Inténtalo de nuevo.';
                this.shake   = true;
                this.loading = false;
            }
        },
    };
}
