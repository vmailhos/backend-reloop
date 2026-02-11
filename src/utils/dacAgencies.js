// src/data/dacAgencies.js
// TODO: completar con todas las agencias desde https://www.dac.com.uy/agencias

const dacAgencies = [
  { id: "dac-montevideo-campo-cerro", department: "Montevideo", name: "Cerro", address: "Perú 2068, Montevideo" },
  { id: "dac-montevideo-perimetral-ruta5", department: "Montevideo", name: "Perimetral Ruta 5", address: "Ruta 5 Km 16 Esq Ruta 102, Montevideo" },
  { id: "dac-montevideo-ancap-uruguayana", department: "Montevideo", name: "Ancap Uruguayana", address: "Uruguayana 3328, Montevideo" },
  { id: "dac-montevideo-av-italia", department: "Montevideo", name: "Av. Italia", address: "Av. Italia 5680, Montevideo" },
  { id: "dac-montevideo-ciudad-vieja", department: "Montevideo", name: "Ciudad Vieja", address: "Juan Carlos Gómez 1447, Montevideo" },
  { id: "dac-montevideo-funsa", department: "Montevideo", name: "Funsa", address: "Camino Corrales 3076, Montevideo" },
  { id: "dac-montevideo-la-comercial", department: "Montevideo", name: "La Comercial", address: "Hocquart 1622, Montevideo" },
  { id: "dac-montevideo-mercado-modelo", department: "Montevideo", name: "Mercado Modelo", address: "José Batlle y Ordóñez Esq Thompson, Montevideo" },
  { id: "dac-montevideo-millan", department: "Montevideo", name: "Millán", address: "Avda. Millán 4110, Montevideo" },
  { id: "dac-montevideo-paso-molino", department: "Montevideo", name: "Paso Molino", address: "Mariano Sagasta 64, Montevideo" },
  { id: "dac-montevideo-tres-cruces", department: "Montevideo", name: "Tres Cruces", address: "Terminal Tres Cruces, Bv. Artigas, Montevideo" },

  { id: "dac-canelones-canelones", department: "Canelones", name: "Canelones", address: "José Batlle y Ordóñez 310, Canelones" },
  { id: "dac-colonia-carmelo", department: "Colonia", name: "Carmelo", address: "18 de Julio 411, Colonia" },
  { id: "dac-colonia-colonia-terminal", department: "Colonia", name: "Colonia Terminal", address: "Terminal Av. Roosevelt, Colonia" },
  { id: "dac-colonia-nueva-helvecia", department: "Colonia", name: "Nueva Helvecia", address: "Camino de los Colonos Esq German Imhoff, Colonia" },
  { id: "dac-maldonado-maldonado", department: "Maldonado", name: "Maldonado", address: "Santa Teresa 600, Maldonado" },
  { id: "dac-maldonado-piriapolis", department: "Maldonado", name: "Piriápolis", address: "Zolezzi 842, Maldonado" },
  { id: "dac-salto-salto-terminal", department: "Salto", name: "Salto Terminal", address: "Av. Batlle 2265, Salto" },
  { id: "dac-paysandu-paysandu-terminal", department: "Paysandú", name: "Paysandú Terminal", address: "Bulevar Artigas 770, Paysandú" },
  { id: "dac-tacuarembo-tacuarembo-terminal", department: "Tacuarembó", name: "Tacuarembó Terminal", address: "Terminal Carlos Gardel, Tacuarembó" },
  { id: "dac-rocha-rocha", department: "Rocha", name: "Rocha", address: "Lavalleja 67 Bis, Rocha" },
  { id: "dac-treinta-y-tres-treinta-y-tres", department: "Treinta y Tres", name: "Treinta y Tres", address: "Manuel Lavalleja, Treinta y Tres" },
  { id: "dac-rio-branco-rio-branco", department: "Cerro Largo", name: "Río Branco", address: "Virrey Arredondo 1263, Río Branco" },
  { id: "dac-melo-melo", department: "Cerro Largo", name: "Melo", address: "Doroteo Navarrete 865, Melo" },

  { id: "dac-san-jose-san-jose-centro", department: "San José", name: "San José Centro", address: "Batlle y Ordóñez 349, San José" },
  { id: "dac-soriano-palmitas", department: "Soriano", name: "Palmitas", address: "18 de Julio y Juana de Ibarbou, Soriano" },
  { id: "dac-flores-trinidad", department: "Flores", name: "Trinidad", address: "Terminal de Omnibus Guyunusa, Flores" },
  // … puedes seguir agregando según lo necesites

];

function getDacAgencyById(id) {
  return dacAgencies.find(a => a.id === id) || null;
}

function listDacAgencies(department) {
  if (!department) return dacAgencies;
  const dep = String(department).toLowerCase().trim();
  return dacAgencies.filter(a => String(a.department).toLowerCase().trim() === dep);
}

module.exports = { dacAgencies, getDacAgencyById, listDacAgencies };
