/**
 * Marketing site FR/EN: persistence, CMS payload merge, static UI strings.
 */
(function (global) {
  var STORAGE_KEY = 'lesmarinettes.lang';

  var STRINGS = {
    fr: {
      'nav.home': 'Accueil',
      'nav.about': 'À Propos',
      'nav.admissions': 'Inscription',
      'nav.gallery': 'Galerie',
      'nav.contact': 'Nous Contacter',
      'footer.about_title': 'À Propos des Marinettes',
      'footer.about_blurb':
        "Le Complexe Scolaire Bilingue Les Marinettes a été fondé avec pour mission d'offrir une éducation de haute qualité dans un environnement multiculturel et bienveillant.",
      'footer.learn_more': 'En savoir plus',
      'footer.programs_title': 'Nos Programmes',
      'footer.quick_title': 'Liens Rapides',
      'footer.reach_title': 'Comment nous joindre',
      'footer.copyright': '© 2026 Complexe Scolaire Bilingue Les Marinettes.',
      'footer.prog_admissions': 'Admissions 2026-2027',
      'footer.prog_nursery': 'Section Maternelle',
      'footer.prog_primary': 'Section Primaire',
      'footer.prog_fees': 'Frais de Scolarité',
      'footer.prog_events': "Événements de l'école",
      'footer.quick_faq': 'FAQ',
      'footer.quick_team': 'Notre Équipe',
      'footer.quick_about': 'À Propos de Nous',
      'footer.quick_contact': 'Nous Contacter',
      'footer.quick_gallery': 'Galerie Photos',
      'pages.index.title': 'Les Marinettes | Complexe Scolaire Bilingue',
      'pages.gallery.title': 'Galerie | Les Marinettes',
      'pages.admissions.title': 'Admissions | Les Marinettes',
      'pages.about.title': 'À Propos | Les Marinettes',
      'pedagogy.badge': 'Notre Pédagogie',
      'pedagogy.heading': "Des programmes conçus pour l'avenir",
      'pedagogy.card1_title': 'Alphabétisation & Langues',
      'pedagogy.card1_text':
        'Un enseignement bilingue immersif dès le plus jeune âge pour garantir une communication fluide et ouverte sur le monde.',
      'pedagogy.card2_title': 'Mathématiques & Sciences',
      'pedagogy.card2_text':
        "Développer l'esprit critique, la logique et la curiosité scientifique à travers une méthodologie rigoureuse.",
      'pedagogy.card3_title': 'Compétences de Vie',
      'pedagogy.card3_text':
        'Éducation civique, arts et savoir-vivre. Nous formons des citoyens brillants et responsables.',
      'contact.loc_badge': 'Localisation',
      'contact.loc_heading': 'Retrouver nous au quartier Feubat.',
      'contact.intro':
        "Appelez-nous à l'un de nos numéros ou remplissez le formulaire ci-contre et nous nous assurerons de vous contacter dans les plus brefs délais.",
      'contact.form_heading': 'Remplissez le formulaire ci-dessous !',
      'contact.placeholder_name': 'Nom Complet',
      'contact.placeholder_phone': 'Numéro de Téléphone',
      'contact.placeholder_email': 'Adresse e-mail (Optionnel)',
      'contact.placeholder_city': 'Ville ou Quartier',
      'contact.placeholder_message': 'Veuillez entrer votre message ou demande de renseignements ici...',
      'contact.submit': 'Envoyer le message',
      'gallery.hero_title': 'Notre Galerie',
      'gallery.hero_sub':
        'Découvrez la vie quotidienne et les moments forts aux Marinettes.',
      'gallery.filter_all': 'Tout',
      'gallery.filter_maternelle': 'Maternelle',
      'gallery.filter_primaire': 'Primaire',
      'gallery.filter_sports': 'Sports',
      'gallery.filter_events': 'Événements',
      'gallery.badge_video': 'Vidéo',
      'admissions.process_badge': 'Processus',
      'admissions.process_heading': "Votre parcours d'admission",
      'admissions.docs_heading': 'Pièces à fournir',
      'admissions.sidebar_cta': 'Inscrire mon enfant',
      'admissions.sidebar_location': 'Localisation',
      'admissions.sidebar_call': 'Appelez-nous',
      'admissions.sidebar_email': 'Email',
      'admissions.download_btn': 'Télécharger le Formulaire',
      'apropos.foundations': 'Nos Fondements',
      'apropos.contact_card': 'Nous Contacter',
      'apropos.phone_label': 'Téléphone',
      'apropos.book': 'Prendre Rendez-vous',
      'apropos.hours': 'Ouvert : 07h30 - 16h00',
      'apropos.founder_label': 'Fondatrice',
      'apropos.rdv_title': 'Prendre rendez-vous',
      'apropos.rdv_name': 'Nom et prénom',
      'apropos.rdv_phone': 'Téléphone',
      'apropos.rdv_email': 'E-mail',
      'apropos.rdv_date': 'Date souhaitée (optionnel)',
      'apropos.rdv_message': 'Message',
      'apropos.rdv_submit': 'Envoyer la demande',
      'apropos.rdv_close': 'Fermer',
      'admissions.contact_secretariat': 'Contacter le secrétariat',
    },
    en: {
      'nav.home': 'Home',
      'nav.about': 'About',
      'nav.admissions': 'Admissions',
      'nav.gallery': 'Gallery',
      'nav.contact': 'Contact us',
      'footer.about_title': 'About Les Marinettes',
      'footer.about_blurb':
        'Les Marinettes Bilingual School was founded to offer high-quality education in a multicultural, caring environment.',
      'footer.learn_more': 'Learn more',
      'footer.programs_title': 'Our programmes',
      'footer.quick_title': 'Quick links',
      'footer.reach_title': 'How to reach us',
      'footer.copyright': '© 2026 Les Marinettes Bilingual School.',
      'footer.prog_admissions': 'Admissions 2026–2027',
      'footer.prog_nursery': 'Nursery section',
      'footer.prog_primary': 'Primary section',
      'footer.prog_fees': 'Tuition & fees',
      'footer.prog_events': 'School events',
      'footer.quick_faq': 'FAQ',
      'footer.quick_team': 'Our team',
      'footer.quick_about': 'About us',
      'footer.quick_contact': 'Contact',
      'footer.quick_gallery': 'Photo gallery',
      'pages.index.title': 'Les Marinettes | Bilingual School',
      'pages.gallery.title': 'Gallery | Les Marinettes',
      'pages.admissions.title': 'Admissions | Les Marinettes',
      'pages.about.title': 'About | Les Marinettes',
      'pedagogy.badge': 'Our approach',
      'pedagogy.heading': 'Programmes built for the future',
      'pedagogy.card1_title': 'Literacy & languages',
      'pedagogy.card1_text':
        'Immersive bilingual teaching from the earliest years for fluent communication and an open outlook on the world.',
      'pedagogy.card2_title': 'Mathematics & science',
      'pedagogy.card2_text':
        'Building critical thinking, logic, and scientific curiosity through rigorous methods.',
      'pedagogy.card3_title': 'Life skills',
      'pedagogy.card3_text':
        'Civics, arts, and social skills — we nurture bright, responsible citizens.',
      'contact.loc_badge': 'Location',
      'contact.loc_heading': 'Find us in the Feubat neighbourhood.',
      'contact.intro':
        'Call us or use the form and we will get back to you as soon as possible.',
      'contact.form_heading': 'Fill in the form below',
      'contact.placeholder_name': 'Full name',
      'contact.placeholder_phone': 'Phone number',
      'contact.placeholder_email': 'Email (optional)',
      'contact.placeholder_city': 'City or neighbourhood',
      'contact.placeholder_message': 'Your message or enquiry…',
      'contact.submit': 'Send message',
      'gallery.hero_title': 'Our gallery',
      'gallery.hero_sub': 'Daily life and highlights at Les Marinettes.',
      'gallery.filter_all': 'All',
      'gallery.filter_maternelle': 'Nursery',
      'gallery.filter_primaire': 'Primary',
      'gallery.filter_sports': 'Sports',
      'gallery.filter_events': 'Events',
      'gallery.badge_video': 'Video',
      'admissions.process_badge': 'Process',
      'admissions.process_heading': 'Your admission journey',
      'admissions.docs_heading': 'Documents required',
      'admissions.sidebar_cta': 'Enrol my child',
      'admissions.sidebar_location': 'Location',
      'admissions.sidebar_call': 'Call us',
      'admissions.sidebar_email': 'Email',
      'admissions.download_btn': 'Download the form',
      'apropos.foundations': 'Our foundations',
      'apropos.contact_card': 'Contact us',
      'apropos.phone_label': 'Phone',
      'apropos.book': 'Book an appointment',
      'apropos.hours': 'Open: 7:30 a.m. – 4:00 p.m.',
      'apropos.founder_label': 'Founder',
      'apropos.rdv_title': 'Book an appointment',
      'apropos.rdv_name': 'Full name',
      'apropos.rdv_phone': 'Phone',
      'apropos.rdv_email': 'Email',
      'apropos.rdv_date': 'Preferred date (optional)',
      'apropos.rdv_message': 'Message',
      'apropos.rdv_submit': 'Send request',
      'apropos.rdv_close': 'Close',
      'admissions.contact_secretariat': 'Contact the office',
    },
  };

  function getLang() {
    var s = localStorage.getItem(STORAGE_KEY);
    return s === 'en' ? 'en' : 'fr';
  }

  function setLang(lang) {
    var l = lang === 'en' ? 'en' : 'fr';
    localStorage.setItem(STORAGE_KEY, l);
    document.documentElement.lang = l;
    return l;
  }

  function changeLanguage(lang) {
    setLang(lang);
    location.reload();
  }

  function initLangSwitcher() {
    var sel = document.getElementById('lang-switcher');
    if (sel) sel.value = getLang();
    document.documentElement.lang = getLang();
  }

  function t(key) {
    var lang = getLang();
    var table = STRINGS[lang] || STRINGS.fr;
    if (table[key]) return table[key];
    return STRINGS.fr[key] || key;
  }

  function applyDataI18n(root) {
    var scope = root || document;
    scope.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (!key) return;
      var val = t(key);
      if (el.tagName === 'TITLE') {
        document.title = val;
      } else {
        el.textContent = val;
      }
    });
    scope.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      if (key) el.setAttribute('placeholder', t(key));
    });
    scope.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-html');
      if (key) el.innerHTML = t(key);
    });
  }

  function mergeDeep(target, src) {
    if (!src || typeof src !== 'object') return;
    Object.keys(src).forEach(function (k) {
      var sv = src[k];
      var tv = target[k];
      if (Array.isArray(sv)) {
        if (
          sv.length &&
          typeof sv[0] === 'object' &&
          tv &&
          Array.isArray(tv) &&
          tv.length &&
          typeof tv[0] === 'object'
        ) {
          sv.forEach(function (item, i) {
            if (tv[i] && item && typeof item === 'object') mergeDeep(tv[i], item);
          });
        } else {
          target[k] = sv;
        }
      } else if (sv && typeof sv === 'object' && !Array.isArray(sv)) {
        if (!target[k]) target[k] = {};
        mergeDeep(target[k], sv);
      } else {
        target[k] = sv;
      }
    });
  }

  /**
   * Merges payload.i18n[lang] onto a clone of payload (French base). Removes i18n from result.
   */
  function mergeLocalizedPayload(base, lang) {
    if (!base || typeof base !== 'object') return base;
    var out = JSON.parse(JSON.stringify(base));
    delete out.i18n;
    if (lang !== 'en' || !base.i18n || !base.i18n.en) return out;
    mergeDeep(out, base.i18n.en);
    return out;
  }

  global.getLang = getLang;
  global.setLang = setLang;
  global.changeLanguage = changeLanguage;
  global.initLangSwitcher = initLangSwitcher;
  global.t = t;
  global.applyDataI18n = applyDataI18n;
  global.mergeLocalizedPayload = mergeLocalizedPayload;

  /** Build absolute URL for uploaded paths (`images/uploads/...`) or pass through http(s). */
  function publicAssetUrl(path) {
    if (path == null || !String(path).trim()) return '';
    var p = String(path).trim();
    if (/^https?:\/\//i.test(p)) return p;
    return '/' + p.replace(/^\/+/, '');
  }
  global.publicAssetUrl = publicAssetUrl;
})(typeof window !== 'undefined' ? window : globalThis);
