export type Locale = "en" | "es";

export const LOCALE_COOKIE = "locale";

type Vars = Record<string, string | number>;

const en = {
  brand: "Grupo Yakgu Properties Finder",
  nav: {
    dashboard: "Dashboard",
    signIn: "Sign in",
    getStarted: "Get started",
  },
  logout: "Log out",
  backToSearch: "Back to search",
  landing: {
    badge: "AI acquisition analysis on official cadastral data",
    title: "Find your next development opportunity in Spain",
    subtitle:
      "Search land and buildings by cadastral reference, planning status and investment potential — backed by official Catastro data and AI-driven analysis.",
    searchPlaceholder: "Search by city, province, or referencia catastral...",
    searchButton: "Search",
    chipResidential: "Residential",
    chipHotel: "Hotel",
    chipLogistics: "Logistics",
    chipHistoric: "Historic",
    footer:
      "Cadastral references verified against the Sede Electrónica del Catastro. Listing data in this demo is illustrative and for evaluation purposes.",
  },
  auth: {
    loginTitle: "Welcome back",
    loginSubtitle: "Sign in to continue your acquisition search.",
    signupTitle: "Create your account",
    signupSubtitle: "Start sourcing land and development opportunities across Spain.",
    fullName: "Full name",
    email: "Email",
    password: "Password",
    signIn: "Sign in",
    createAccount: "Create account",
    pleaseWait: "Please wait...",
    noAccount: "No account yet?",
    haveAccount: "Already have an account?",
    getStarted: "Get started",
    networkError: "Network error — please try again",
    somethingWrong: "Something went wrong",
  },
  dashboard: {
    searchPlaceholder: "Search by city, province, or referencia catastral...",
    filters: "Filters",
    hideMap: "Hide Map",
    showMap: "Show Map",
    tabCatastro: "Official Catastro Records",
    tabFavorites: "Favorites",
    tabSettings: "Settings",
    searching: "Searching…",
    noCatastro: "No official Catastro records match these filters. Try widening your search.",
    noResultsInView: "No results in the current map view. Pan or zoom out to see more.",
    resultsCount: "{n} result{plural}",
    showingFirstN: " (showing first {n})",
    inView: "{n} of {total} in view",
    loadingMap: "Loading map…",
    showOnMap: "Show on map",
    mapDisplayTitle: "Map display",
    mapDisplayDescription:
      "Choose whether matching properties appear on the map automatically, or only the ones you pick from the list.",
    showOnMapToggle: "Show properties on map automatically",
    selectAll: "Select all",
    clearSelection: "Clear selection",
    selectedCount: "{n} selected",
    favoritesDescription: "Properties you've liked from the official Catastro records.",
    noFavorites: "You haven't liked any properties yet. Click the heart icon on a property to add it here.",
  },
  presets: {
    trigger: "Presets",
    save: "Save current view",
    namePlaceholder: "Preset name",
    empty: "No saved presets yet. Pan/zoom the map, then save this view.",
    setDefault: "Set as default",
    unsetDefault: "Unset as default",
    delete: "Delete preset",
    confirmDelete: 'Delete preset "{name}"?',
    rename: "Rename preset",
    renameFailed: "Couldn't rename preset",
    refocus: 'Re-center the map on "{name}"',
    settingsTitle: "Map presets",
    settingsDescription:
      "Save the map's current pan/zoom position and search filters under a name, mark one as default to load it automatically, or delete presets you no longer need. Use the presets dropdown in the header to quickly jump between saved views.",
    needViewToSave: "Pan or zoom the map first to save its current view.",
  },
  filters: {
    title: "Filters",
    clearAll: "Clear all",
    location: "Location",
    cityMunicipality: "City / Municipality",
    province: "Province",
    autonomousCommunityAny: "Autonomous Community (any)",
    streetName: "Street name",
    streetNumberShort: "No.",
    landCharacteristics: "Land Characteristics",
    plotSize: "Plot Size (m²)",
    builtArea: "Built Area (m²)",
    constructionYear: "Construction Year",
    numberOfFloors: "Number of Floors",
    landUse: "Land Use",
    cadastralUse: "Cadastral Use (Clase de inmueble)",
    min: "Min",
    max: "Max",
  },
  table: {
    referenciaCatastral: "Referencia Catastral",
    address: "Address",
    municipality: "Municipality",
    province: "Province",
    plotSize: "Plot Size",
    builtArea: "Built Area",
    year: "Year",
    floors: "Floors",
    cadastralUse: "Cadastral Use",
    landUse: "Land Use",
    showing: "Showing {start}–{end} of {total}",
    prev: "Prev",
    next: "Next",
    pageOf: "Page {page} of {total}",
  },
  card: {
    floors: "floors",
    like: "Like",
    unlike: "Unlike",
  },
  detail: {
    officialCatastroRecord: "Official Catastro Record",
    generalInformation: "General Information",
    landData: "Land Data",
    address: "Address",
    municipality: "Municipality",
    province: "Province",
    autonomousCommunity: "Autonomous Community",
    coordinates: "Coordinates",
    referenciaCatastral: "Referencia Catastral",
    sourceDataset: "Source Dataset",
    imported: "Imported",
    plotSizeLabel: "Plot Size (Superficie del terreno)",
    superficieConstruida: "Superficie construida",
    currentUse: "Current Use (Uso principal)",
    claseDeInmueble: "Clase de inmueble",
    buildingYear: "Building Year (Año de construcción)",
    numberOfFloors: "Number of Floors",
  },
  comments: {
    heading: "Comments",
    empty: "No comments yet.",
    bodyPlaceholder: "Write a comment...",
    submit: "Add comment",
    posting: "Posting...",
    postError: "Failed to post comment. Please try again.",
    edited: "edited",
    edit: "Edit",
    delete: "Delete",
    save: "Save",
    saving: "Saving...",
    cancel: "Cancel",
    deleteConfirm: "Delete this comment? This cannot be undone.",
  },
  language: {
    switchTo: "Español",
  },
} satisfies Record<string, unknown>;

const es: typeof en = {
  brand: "Grupo Yakgu Properties Finder",
  nav: {
    dashboard: "Panel",
    signIn: "Iniciar sesión",
    getStarted: "Empezar",
  },
  logout: "Cerrar sesión",
  backToSearch: "Volver a la búsqueda",
  landing: {
    badge: "Análisis de adquisición con IA sobre datos catastrales oficiales",
    title: "Encuentra tu próxima oportunidad de desarrollo en España",
    subtitle:
      "Busca suelo y edificaciones por referencia catastral, situación urbanística y potencial de inversión — con datos oficiales del Catastro y análisis impulsado por IA.",
    searchPlaceholder: "Busca por ciudad, provincia o referencia catastral...",
    searchButton: "Buscar",
    chipResidential: "Residencial",
    chipHotel: "Hotel",
    chipLogistics: "Logística",
    chipHistoric: "Histórico",
    footer:
      "Las referencias catastrales se verifican contra la Sede Electrónica del Catastro. Los datos de esta demo son ilustrativos y para fines de evaluación.",
  },
  auth: {
    loginTitle: "Bienvenido de nuevo",
    loginSubtitle: "Inicia sesión para continuar tu búsqueda de adquisición.",
    signupTitle: "Crea tu cuenta",
    signupSubtitle: "Empieza a buscar suelo y oportunidades de desarrollo en España.",
    fullName: "Nombre completo",
    email: "Correo electrónico",
    password: "Contraseña",
    signIn: "Iniciar sesión",
    createAccount: "Crear cuenta",
    pleaseWait: "Un momento...",
    noAccount: "¿Aún no tienes cuenta?",
    haveAccount: "¿Ya tienes una cuenta?",
    getStarted: "Empezar",
    networkError: "Error de red — inténtalo de nuevo",
    somethingWrong: "Algo salió mal",
  },
  dashboard: {
    searchPlaceholder: "Busca por ciudad, provincia o referencia catastral...",
    filters: "Filtros",
    hideMap: "Ocultar mapa",
    showMap: "Mostrar mapa",
    tabCatastro: "Registros Oficiales del Catastro",
    tabFavorites: "Favoritos",
    tabSettings: "Ajustes",
    searching: "Buscando…",
    noCatastro:
      "Ningún registro oficial del Catastro coincide con estos filtros. Prueba a ampliar tu búsqueda.",
    noResultsInView:
      "No hay resultados en la vista actual del mapa. Desplázate o aleja el zoom para ver más.",
    resultsCount: "{n} resultado{plural}",
    showingFirstN: " (mostrando los primeros {n})",
    inView: "{n} de {total} en vista",
    loadingMap: "Cargando mapa…",
    showOnMap: "Ver en el mapa",
    mapDisplayTitle: "Visualización del mapa",
    mapDisplayDescription:
      "Elige si las propiedades que coinciden aparecen automáticamente en el mapa, o solo las que selecciones de la lista.",
    showOnMapToggle: "Mostrar propiedades en el mapa automáticamente",
    selectAll: "Seleccionar todo",
    clearSelection: "Borrar selección",
    selectedCount: "{n} seleccionadas",
    favoritesDescription: "Propiedades que te han gustado de los registros oficiales del Catastro.",
    noFavorites:
      "Aún no te ha gustado ninguna propiedad. Haz clic en el icono de corazón de una propiedad para añadirla aquí.",
  },
  presets: {
    trigger: "Ajustes guardados",
    save: "Guardar vista actual",
    namePlaceholder: "Nombre del ajuste",
    empty: "Aún no hay ajustes guardados. Desplaza o haz zoom en el mapa y guarda esta vista.",
    setDefault: "Marcar como predeterminado",
    unsetDefault: "Quitar como predeterminado",
    delete: "Eliminar ajuste",
    confirmDelete: '¿Eliminar el ajuste "{name}"?',
    rename: "Renombrar ajuste",
    renameFailed: "No se pudo renombrar el ajuste",
    refocus: 'Volver a centrar el mapa en "{name}"',
    settingsTitle: "Ajustes guardados del mapa",
    settingsDescription:
      "Guarda la posición actual de desplazamiento/zoom del mapa y los filtros de búsqueda con un nombre, marca uno como predeterminado para cargarlo automáticamente, o elimina los ajustes que ya no necesites. Usa el menú desplegable de ajustes en la cabecera para saltar rápidamente entre vistas guardadas.",
    needViewToSave: "Desplaza o haz zoom en el mapa primero para guardar la vista actual.",
  },
  filters: {
    title: "Filtros",
    clearAll: "Limpiar todo",
    location: "Ubicación",
    cityMunicipality: "Ciudad / Municipio",
    province: "Provincia",
    autonomousCommunityAny: "Comunidad Autónoma (cualquiera)",
    streetName: "Nombre de la calle",
    streetNumberShort: "N.º",
    landCharacteristics: "Características del Terreno",
    plotSize: "Superficie del terreno (m²)",
    builtArea: "Superficie construida (m²)",
    constructionYear: "Año de construcción",
    numberOfFloors: "Número de plantas",
    landUse: "Uso del suelo",
    cadastralUse: "Uso catastral (Clase de inmueble)",
    min: "Mín",
    max: "Máx",
  },
  table: {
    referenciaCatastral: "Referencia Catastral",
    address: "Dirección",
    municipality: "Municipio",
    province: "Provincia",
    plotSize: "Superficie",
    builtArea: "Sup. Construida",
    year: "Año",
    floors: "Plantas",
    cadastralUse: "Uso Catastral",
    landUse: "Uso del Suelo",
    showing: "Mostrando {start}–{end} de {total}",
    prev: "Anterior",
    next: "Siguiente",
    pageOf: "Página {page} de {total}",
  },
  card: {
    floors: "plantas",
    like: "Me gusta",
    unlike: "Ya no me gusta",
  },
  detail: {
    officialCatastroRecord: "Registro Oficial del Catastro",
    generalInformation: "Información General",
    landData: "Datos del Terreno",
    address: "Dirección",
    municipality: "Municipio",
    province: "Provincia",
    autonomousCommunity: "Comunidad Autónoma",
    coordinates: "Coordenadas",
    referenciaCatastral: "Referencia Catastral",
    sourceDataset: "Conjunto de Datos de Origen",
    imported: "Importado",
    plotSizeLabel: "Superficie del terreno",
    superficieConstruida: "Superficie construida",
    currentUse: "Uso principal",
    claseDeInmueble: "Clase de inmueble",
    buildingYear: "Año de construcción",
    numberOfFloors: "Número de Plantas",
  },
  comments: {
    heading: "Comentarios",
    empty: "Todavía no hay comentarios.",
    bodyPlaceholder: "Escribe un comentario...",
    submit: "Añadir comentario",
    posting: "Publicando...",
    postError: "No se pudo publicar el comentario. Inténtalo de nuevo.",
    edited: "editado",
    edit: "Editar",
    delete: "Eliminar",
    save: "Guardar",
    saving: "Guardando...",
    cancel: "Cancelar",
    deleteConfirm: "¿Eliminar este comentario? Esta acción no se puede deshacer.",
  },
  language: {
    switchTo: "English",
  },
};

export const translations: Record<Locale, typeof en> = { en, es };

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = vars[key];
    return value === undefined ? `{${key}}` : String(value);
  });
}

function lookup(dict: unknown, path: string[]): unknown {
  return path.reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, dict);
}

export function translate(locale: Locale, key: string, vars?: Vars): string {
  const path = key.split(".");
  const value = lookup(translations[locale], path) ?? lookup(translations.en, path);
  return typeof value === "string" ? interpolate(value, vars) : key;
}

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "es";
}
