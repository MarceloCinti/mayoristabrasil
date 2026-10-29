// Departamentos y ciudades/distritos de Paraguay (cascada departamento → ciudad).
// Incluye los distritos principales de cada departamento + "Otra ciudad" como respaldo.

export const DEPARTAMENTOS = [
  'Asunción (Capital)',
  'Central',
  'Alto Paraná',
  'Itapúa',
  'Caaguazú',
  'San Pedro',
  'Cordillera',
  'Guairá',
  'Caazapá',
  'Misiones',
  'Paraguarí',
  'Ñeembucú',
  'Amambay',
  'Canindeyú',
  'Concepción',
  'Presidente Hayes',
  'Boquerón',
  'Alto Paraguay',
] as const;

export const CIUDADES: Record<string, string[]> = {
  'Asunción (Capital)': ['Asunción'],
  'Central': [
    'Areguá', 'Capiatá', 'Fernando de la Mora', 'Guarambaré', 'Itá', 'Itauguá',
    'Lambaré', 'Limpio', 'Luque', 'Mariano Roque Alonso', 'Nueva Italia', 'Ñemby',
    'San Antonio', 'San Lorenzo', 'Villa Elisa', 'Villeta', 'Ypacaraí', 'Ypané',
    'J. Augusto Saldívar',
  ],
  'Alto Paraná': [
    'Ciudad del Este', 'Presidente Franco', 'Hernandarias', 'Minga Guazú', 'Santa Rita',
    'Naranjal', 'Itakyry', 'Juan León Mallorquín', 'San Cristóbal', 'Yguazú',
    'Los Cedrales', 'Ñacunday', 'San Alberto', 'Mbaracayú', 'Santa Rosa del Monday',
    'Tavapy', 'Domingo Martínez de Irala', 'Iruña', 'Doctor Raúl Peña',
  ],
  'Itapúa': [
    'Encarnación', 'Cambyretá', 'Capitán Miranda', 'Bella Vista', 'Hohenau', 'Obligado',
    'Coronel Bogado', 'General Artigas', 'Carmen del Paraná', 'Fram', 'Trinidad', 'Jesús',
    'Capitán Meza', 'Edelira', 'Tomás Romero Pereira', 'Natalio', 'San Pedro del Paraná',
    'San Rafael del Paraná', 'Pirapó', 'Yatytay', 'Nueva Alborada', 'La Paz', 'Mayor Otaño',
  ],
  'Caaguazú': [
    'Coronel Oviedo', 'Caaguazú', 'Dr. Juan Eulogio Estigarribia (Campo 9)', 'Repatriación',
    'San José de los Arroyos', 'Carayaó', 'Cecilio Báez', 'Santa Rosa del Mbutuy', 'Yhú',
    'Vaquería', 'José Domingo Ocampos', 'Raúl Arsenio Oviedo', 'Mariscal López', 'San Joaquín',
  ],
  'San Pedro': [
    'San Pedro de Ycuamandyyú', 'San Estanislao (Santaní)', 'Santa Rosa del Aguaray', 'Choré',
    'Guayaibí', 'Nueva Germania', 'General Elizardo Aquino', 'Lima', 'Tacuati', 'Unión',
    'Villa del Rosario', 'Yataity del Norte', 'Capiibary',
  ],
  'Cordillera': [
    'Caacupé', 'Tobatí', 'Eusebio Ayala', 'Itacurubí de la Cordillera', 'Piribebuy',
    'Arroyos y Esteros', 'Atyrá', 'Altos', 'Emboscada', 'San Bernardino', 'Caraguatay',
    'Juan de Mena', 'Isla Pucú', 'Santa Elena', 'Valenzuela', 'Primero de Marzo',
  ],
  'Guairá': [
    'Villarrica', 'Independencia', 'Coronel Martínez', 'Mbocayaty', 'Ñumí', 'Itapé',
    'Borja', 'Iturbe', 'San Salvador', 'Yataity', 'Félix Pérez Cardozo', 'Paso Yobái',
  ],
  'Caazapá': [
    'Caazapá', 'San Juan Nepomuceno', 'Yuty', 'Maciel', 'Buena Vista', 'Abaí',
    'General Higinio Morínigo', 'Tavaí', 'Fulgencio Yegros', 'San Pedro del Paraná',
  ],
  'Misiones': [
    'San Juan Bautista', 'San Ignacio', 'Santa Rosa', 'Ayolas', 'Santiago', 'San Miguel',
    'San Patricio', 'Villa Florida', 'Yabebyry', 'Santa María',
  ],
  'Paraguarí': [
    'Paraguarí', 'Carapeguá', 'Ybycuí', 'Quiindy', 'Acahay', 'Caapucú', 'Yaguarón',
    'Pirayú', 'Sapucai', 'Escobar', 'La Colmena', 'Mbuyapey', 'Tebicuary', 'Ybytymí',
  ],
  'Ñeembucú': [
    'Pilar', 'Alberdi', 'Cerrito', 'Desmochados', 'General José Eduvigis Díaz', 'Guazú Cuá',
    'Humaitá', 'Isla Umbú', 'Laureles', 'Mayor José Martínez', 'Paso de Patria', 'San Juan Bautista del Ñeembucú', 'Tacuaras', 'Villa Franca', 'Villa Oliva', 'Villalbín',
  ],
  'Amambay': [
    'Pedro Juan Caballero', 'Capitán Bado', 'Bella Vista Norte', 'Zanja Pytã', 'Karapaí',
  ],
  'Canindeyú': [
    'Salto del Guairá', 'Curuguaty', 'Katueté', 'La Paloma del Espíritu Santo', 'Nueva Esperanza',
    'Ygatimí', 'Itanará', 'Ypejhú', 'Corpus Christi', 'Villa Ygatimí', 'Yasy Cañy', 'General Francisco Caballero Álvarez',
  ],
  'Concepción': [
    'Concepción', 'Horqueta', 'Loreto', 'Yby Yaú', 'Belén', 'San Lázaro', 'San Carlos del Apa',
    'Azotey', 'Sargento José Félix López (Puentesiño)', 'Paso Barreto',
  ],
  'Presidente Hayes': [
    'Villa Hayes', 'Benjamín Aceval', 'Nanawa', 'José Falcón', 'Puerto Pinasco',
    'General José María Bruguez', 'Teniente Irala Fernández', 'Pozo Colorado',
  ],
  'Boquerón': [
    'Filadelfia', 'Loma Plata', 'Mariscal Estigarribia', 'Neuland', 'Pedro P. Peña',
  ],
  'Alto Paraguay': [
    'Fuerte Olimpo', 'Bahía Negra', 'Carmelo Peralta', 'Puerto Casado (La Victoria)',
  ],
};

// Agrega "Otra ciudad" como última opción de cada departamento
Object.keys(CIUDADES).forEach(dep => {
  if (dep !== 'Asunción (Capital)') CIUDADES[dep] = [...CIUDADES[dep], 'Otra ciudad'];
});

export const GENEROS = ['Femenino', 'Masculino', 'Otro', 'Prefiero no decir'] as const;

// Calcula edad a partir de fecha YYYY-MM-DD
export function calcularEdad(fechaNacimiento?: string): number | null {
  if (!fechaNacimiento) return null;
  const nac = new Date(fechaNacimiento);
  if (isNaN(nac.getTime())) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}
