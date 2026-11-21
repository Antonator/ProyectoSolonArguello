// Autores y obras reales que forman la base del acervo de ejemplo.
// [nombre, nacionalidad, nacimiento, fallecimiento, esNayarita, géneros, obras]
// obra: [título, año, categoría, páginas, sala?]
export const AUTORES_REALES = [
  ['Amado Nervo', 'Mexicana', 1870, 1919, true, ['Poesía', 'Novela'], [
    ['La amada inmóvil', 1922, 'Poesía', 160, 'Fondo Nayarita'],
    ['Plenitud', 1918, 'Poesía', 140, 'Fondo Nayarita'],
    ['El bachiller', 1895, 'Literatura mexicana', 96, 'Fondo Nayarita'],
    ['Perlas negras', 1898, 'Poesía', 120, 'Fondo Nayarita'],
    ['Serenidad', 1914, 'Poesía', 150, 'Fondo Nayarita'],
    ['Elevación', 1917, 'Poesía', 130, 'Fondo Nayarita'],
    ['En voz baja', 1909, 'Poesía', 110, 'Fondo Nayarita'],
  ]],
  ['Alí Chumacero', 'Mexicana', 1918, 2010, true, ['Poesía', 'Ensayo'], [
    ['Páramo de sueños', 1944, 'Poesía', 88, 'Fondo Nayarita'],
    ['Imágenes desterradas', 1948, 'Poesía', 92, 'Fondo Nayarita'],
    ['Palabras en reposo', 1956, 'Poesía', 104, 'Fondo Nayarita'],
  ]],
  ['Solón Argüello', 'Nicaragüense', null, null, false, ['Poesía'], [
    ['Antología poética', null, 'Poesía', 220, 'Fondo Nayarita'],
  ]],
  ['Juan Rulfo', 'Mexicana', 1917, 1986, false, ['Novela', 'Cuento'], [
    ['Pedro Páramo', 1955, 'Literatura mexicana', 128],
    ['El llano en llamas', 1953, 'Literatura mexicana', 170],
  ]],
  ['Octavio Paz', 'Mexicana', 1914, 1998, false, ['Ensayo', 'Poesía'], [
    ['El laberinto de la soledad', 1950, 'Ensayo', 350],
    ['Piedra de sol', 1957, 'Poesía', 64],
    ['El arco y la lira', 1956, 'Ensayo', 300],
  ]],
  ['Carlos Fuentes', 'Mexicana', 1928, 2012, false, ['Novela'], [
    ['La muerte de Artemio Cruz', 1962, 'Literatura mexicana', 320],
    ['Aura', 1962, 'Literatura mexicana', 64],
    ['La región más transparente', 1958, 'Literatura mexicana', 480],
  ]],
  ['Elena Poniatowska', 'Mexicana', 1932, null, false, ['Crónica', 'Novela'], [
    ['La noche de Tlatelolco', 1971, 'Historia', 290],
    ['Hasta no verte Jesús mío', 1969, 'Literatura mexicana', 320],
  ]],
  ['Rosario Castellanos', 'Mexicana', 1925, 1974, false, ['Novela', 'Poesía'], [
    ['Balún Canán', 1957, 'Literatura mexicana', 300],
    ['Oficio de tinieblas', 1962, 'Literatura mexicana', 370],
  ]],
  ['Juan José Arreola', 'Mexicana', 1918, 2001, false, ['Cuento'], [['Confabulario', 1952, 'Literatura mexicana', 180]]],
  ['Mariano Azuela', 'Mexicana', 1873, 1952, false, ['Novela'], [['Los de abajo', 1916, 'Literatura mexicana', 160]]],
  ['Martín Luis Guzmán', 'Mexicana', 1887, 1976, false, ['Novela'], [['La sombra del caudillo', 1929, 'Literatura mexicana', 260]]],
  ['Laura Esquivel', 'Mexicana', 1950, null, false, ['Novela'], [['Como agua para chocolate', 1989, 'Literatura mexicana', 240]]],
  ['Ángeles Mastretta', 'Mexicana', 1949, null, false, ['Novela'], [['Arráncame la vida', 1985, 'Literatura mexicana', 230]]],
  ['José Emilio Pacheco', 'Mexicana', 1939, 2014, false, ['Novela', 'Poesía'], [['Las batallas en el desierto', 1981, 'Literatura mexicana', 72]]],
  ['Elena Garro', 'Mexicana', 1916, 1998, false, ['Novela'], [['Los recuerdos del porvenir', 1963, 'Literatura mexicana', 300]]],
  ['Sor Juana Inés de la Cruz', 'Mexicana', 1648, 1695, false, ['Poesía'], [['Inundación castálida', 1689, 'Poesía', 330]]],
  ['José Revueltas', 'Mexicana', 1914, 1976, false, ['Novela'], [['El apando', 1969, 'Literatura mexicana', 64]]],
  ['Jorge Ibargüengoitia', 'Mexicana', 1928, 1983, false, ['Novela'], [
    ['Los relámpagos de agosto', 1964, 'Literatura mexicana', 140],
    ['Las muertas', 1977, 'Literatura mexicana', 190],
  ]],
  ['Alfonso Reyes', 'Mexicana', 1889, 1959, false, ['Ensayo'], [['Visión de Anáhuac', 1917, 'Ensayo', 80]]],
  ['José Vasconcelos', 'Mexicana', 1882, 1959, false, ['Ensayo', 'Memorias'], [
    ['La raza cósmica', 1925, 'Ensayo', 200],
    ['Ulises criollo', 1935, 'Biografía', 520],
  ]],
  ['Ignacio Manuel Altamirano', 'Mexicana', 1834, 1893, false, ['Novela'], [
    ['El Zarco', 1901, 'Literatura mexicana', 220],
    ['Clemencia', 1869, 'Literatura mexicana', 200],
  ]],
  ['José Joaquín Fernández de Lizardi', 'Mexicana', 1776, 1827, false, ['Novela'], [['El Periquillo Sarniento', 1816, 'Literatura mexicana', 600]]],
  ['Federico Gamboa', 'Mexicana', 1864, 1939, false, ['Novela'], [['Santa', 1903, 'Literatura mexicana', 330]]],
  ['Valeria Luiselli', 'Mexicana', 1983, null, false, ['Novela', 'Ensayo'], [
    ['Los ingrávidos', 2011, 'Literatura mexicana', 180],
    ['Desierto sonoro', 2019, 'Literatura mexicana', 480],
  ]],
  ['Guadalupe Nettel', 'Mexicana', 1973, null, false, ['Novela'], [['El cuerpo en que nací', 2011, 'Literatura mexicana', 200]]],
  ['Fernanda Melchor', 'Mexicana', 1982, null, false, ['Novela'], [['Temporada de huracanes', 2017, 'Literatura mexicana', 224]]],
  ['Jaime Sabines', 'Mexicana', 1926, 1999, false, ['Poesía'], [['Tarumba', 1956, 'Poesía', 90]]],
  ['Xavier Villaurrutia', 'Mexicana', 1903, 1950, false, ['Poesía'], [['Nostalgia de la muerte', 1938, 'Poesía', 80]]],
  ['Ramón López Velarde', 'Mexicana', 1888, 1921, false, ['Poesía'], [
    ['La sangre devota', 1916, 'Poesía', 100],
    ['Zozobra', 1919, 'Poesía', 96],
  ]],
  ['Juan Villoro', 'Mexicana', 1956, null, false, ['Novela', 'Crónica'], [
    ['El testigo', 2004, 'Literatura mexicana', 470],
    ['El libro salvaje', 2008, 'Juvenil', 240, 'Infantil'],
  ]],
  ['Francisco Hinojosa', 'Mexicana', 1954, null, false, ['Literatura infantil'], [['La peor señora del mundo', 1992, 'Infantil', 48, 'Infantil']]],
  ['Miguel León-Portilla', 'Mexicana', 1926, 2019, false, ['Historia'], [['Visión de los vencidos', 1959, 'Historia', 220]]],
  ['Carlos Monsiváis', 'Mexicana', 1938, 2010, false, ['Crónica', 'Ensayo'], [['Días de guardar', 1970, 'Ensayo', 380]]],
  ['Sergio Pitol', 'Mexicana', 1933, 2018, false, ['Ensayo', 'Novela'], [['El arte de la fuga', 1996, 'Ensayo', 300]]],
  ['Jorge Volpi', 'Mexicana', 1968, null, false, ['Novela'], [['En busca de Klingsor', 1999, 'Literatura mexicana', 450]]],
  ['Gabriel García Márquez', 'Colombiana', 1927, 2014, false, ['Novela', 'Cuento'], [
    ['Cien años de soledad', 1967, 'Literatura universal', 470],
    ['El amor en los tiempos del cólera', 1985, 'Literatura universal', 460],
    ['Crónica de una muerte anunciada', 1981, 'Literatura universal', 120],
    ['El coronel no tiene quien le escriba', 1961, 'Literatura universal', 100],
  ]],
  ['Mario Vargas Llosa', 'Peruana', 1936, 2025, false, ['Novela'], [
    ['La ciudad y los perros', 1963, 'Literatura universal', 420],
    ['La fiesta del Chivo', 2000, 'Literatura universal', 520],
    ['Conversación en La Catedral', 1969, 'Literatura universal', 700],
  ]],
  ['Julio Cortázar', 'Argentina', 1914, 1984, false, ['Novela', 'Cuento'], [
    ['Rayuela', 1963, 'Literatura universal', 630],
    ['Bestiario', 1951, 'Literatura universal', 150],
  ]],
  ['Jorge Luis Borges', 'Argentina', 1899, 1986, false, ['Cuento', 'Poesía'], [
    ['Ficciones', 1944, 'Literatura universal', 200],
    ['El Aleph', 1949, 'Literatura universal', 220],
  ]],
  ['Isabel Allende', 'Chilena', 1942, null, false, ['Novela'], [
    ['La casa de los espíritus', 1982, 'Literatura universal', 500],
    ['Eva Luna', 1987, 'Literatura universal', 300],
  ]],
  ['Pablo Neruda', 'Chilena', 1904, 1973, false, ['Poesía'], [
    ['Veinte poemas de amor y una canción desesperada', 1924, 'Poesía', 90],
    ['Canto general', 1950, 'Poesía', 560],
  ]],
  ['Gabriela Mistral', 'Chilena', 1889, 1957, false, ['Poesía'], [
    ['Desolación', 1922, 'Poesía', 200],
    ['Ternura', 1924, 'Infantil', 120, 'Infantil'],
  ]],
  ['Rubén Darío', 'Nicaragüense', 1867, 1916, false, ['Poesía'], [
    ['Azul...', 1888, 'Poesía', 180],
    ['Cantos de vida y esperanza', 1905, 'Poesía', 160],
  ]],
  ['Horacio Quiroga', 'Uruguaya', 1878, 1937, false, ['Cuento'], [
    ['Cuentos de la selva', 1918, 'Infantil', 110, 'Infantil'],
    ['Cuentos de amor de locura y de muerte', 1917, 'Literatura universal', 200],
  ]],
  ['Mario Benedetti', 'Uruguaya', 1920, 2009, false, ['Novela', 'Poesía'], [['La tregua', 1960, 'Literatura universal', 200]]],
  ['Eduardo Galeano', 'Uruguaya', 1940, 2015, false, ['Ensayo', 'Historia'], [['Las venas abiertas de América Latina', 1971, 'Historia', 380]]],
  ['Alejo Carpentier', 'Cubana', 1904, 1980, false, ['Novela'], [['El reino de este mundo', 1949, 'Literatura universal', 160]]],
  ['José Martí', 'Cubana', 1853, 1895, false, ['Poesía', 'Ensayo'], [
    ['La Edad de Oro', 1889, 'Infantil', 260, 'Infantil'],
    ['Versos sencillos', 1891, 'Poesía', 90],
  ]],
  ['Ernesto Sabato', 'Argentina', 1911, 2011, false, ['Novela'], [['El túnel', 1948, 'Literatura universal', 160]]],
  ['Rómulo Gallegos', 'Venezolana', 1884, 1969, false, ['Novela'], [['Doña Bárbara', 1929, 'Literatura universal', 400]]],
  ['Miguel Ángel Asturias', 'Guatemalteca', 1899, 1974, false, ['Novela'], [['El señor presidente', 1946, 'Literatura universal', 380]]],
  ['César Vallejo', 'Peruana', 1892, 1938, false, ['Poesía'], [['Trilce', 1922, 'Poesía', 120]]],
  ['Roberto Bolaño', 'Chilena', 1953, 2003, false, ['Novela'], [
    ['Los detectives salvajes', 1998, 'Literatura universal', 610],
    ['2666', 2004, 'Literatura universal', 1120],
  ]],
  ['Miguel de Cervantes', 'Española', 1547, 1616, false, ['Novela'], [
    ['Don Quijote de la Mancha', 1605, 'Literatura universal', 1250],
    ['Novelas ejemplares', 1613, 'Literatura universal', 560],
  ]],
  ['Federico García Lorca', 'Española', 1898, 1936, false, ['Poesía', 'Teatro'], [
    ['Romancero gitano', 1928, 'Poesía', 120],
    ['Bodas de sangre', 1933, 'Literatura universal', 120],
    ['La casa de Bernarda Alba', 1945, 'Literatura universal', 110],
  ]],
  ['Antonio Machado', 'Española', 1875, 1939, false, ['Poesía'], [['Campos de Castilla', 1912, 'Poesía', 200]]],
  ['Miguel de Unamuno', 'Española', 1864, 1936, false, ['Novela', 'Ensayo'], [['Niebla', 1914, 'Literatura universal', 280]]],
  ['Benito Pérez Galdós', 'Española', 1843, 1920, false, ['Novela'], [['Marianela', 1878, 'Literatura universal', 220]]],
  ['Carlos Ruiz Zafón', 'Española', 1964, 2020, false, ['Novela'], [['La sombra del viento', 2001, 'Literatura universal', 570]]],
  ['Camilo José Cela', 'Española', 1916, 2002, false, ['Novela'], [['La familia de Pascual Duarte', 1942, 'Literatura universal', 180]]],
  ['Gustavo Adolfo Bécquer', 'Española', 1836, 1870, false, ['Poesía'], [['Rimas y leyendas', 1871, 'Poesía', 300]]],
  ['Juan Ramón Jiménez', 'Española', 1881, 1958, false, ['Poesía', 'Prosa poética'], [['Platero y yo', 1914, 'Infantil', 180, 'Infantil']]],
  ['William Shakespeare', 'Inglesa', 1564, 1616, false, ['Teatro'], [
    ['Hamlet', 1603, 'Literatura universal', 240],
    ['Romeo y Julieta', 1597, 'Literatura universal', 200],
    ['Macbeth', 1623, 'Literatura universal', 160],
  ]],
  ['Antoine de Saint-Exupéry', 'Francesa', 1900, 1944, false, ['Novela'], [['El principito', 1943, 'Infantil', 96, 'Infantil']]],
  ['Victor Hugo', 'Francesa', 1802, 1885, false, ['Novela'], [
    ['Los miserables', 1862, 'Literatura universal', 1500],
    ['Nuestra Señora de París', 1831, 'Literatura universal', 600],
  ]],
  ['Fiódor Dostoievski', 'Rusa', 1821, 1881, false, ['Novela'], [
    ['Crimen y castigo', 1866, 'Literatura universal', 670],
    ['Los hermanos Karamázov', 1880, 'Literatura universal', 1000],
  ]],
  ['León Tolstói', 'Rusa', 1828, 1910, false, ['Novela'], [
    ['Guerra y paz', 1869, 'Literatura universal', 1400],
    ['Anna Karénina', 1877, 'Literatura universal', 960],
  ]],
  ['Franz Kafka', 'Checa', 1883, 1924, false, ['Novela', 'Cuento'], [
    ['La metamorfosis', 1915, 'Literatura universal', 90],
    ['El proceso', 1925, 'Literatura universal', 280],
  ]],
  ['George Orwell', 'Británica', 1903, 1950, false, ['Novela'], [
    ['1984', 1949, 'Literatura universal', 330],
    ['Rebelión en la granja', 1945, 'Literatura universal', 140],
  ]],
  ['Jane Austen', 'Británica', 1775, 1817, false, ['Novela'], [['Orgullo y prejuicio', 1813, 'Literatura universal', 430]]],
  ['Mary Shelley', 'Británica', 1797, 1851, false, ['Novela'], [['Frankenstein', 1818, 'Literatura universal', 280]]],
  ['Dante Alighieri', 'Italiana', 1265, 1321, false, ['Poesía'], [['La Divina Comedia', 1320, 'Poesía', 800]]],
  ['Gustave Flaubert', 'Francesa', 1821, 1880, false, ['Novela'], [['Madame Bovary', 1857, 'Literatura universal', 430]]],
  ['Albert Camus', 'Francesa', 1913, 1960, false, ['Novela', 'Ensayo'], [
    ['El extranjero', 1942, 'Literatura universal', 130],
    ['La peste', 1947, 'Literatura universal', 320],
  ]],
  ['Ernest Hemingway', 'Estadounidense', 1899, 1961, false, ['Novela'], [['El viejo y el mar', 1952, 'Literatura universal', 120]]],
  ['Herman Melville', 'Estadounidense', 1819, 1891, false, ['Novela'], [['Moby Dick', 1851, 'Literatura universal', 720]]],
  ['Mark Twain', 'Estadounidense', 1835, 1910, false, ['Novela'], [['Las aventuras de Tom Sawyer', 1876, 'Juvenil', 260, 'Infantil']]],
  ['Julio Verne', 'Francesa', 1828, 1905, false, ['Novela de aventuras'], [
    ['Veinte mil leguas de viaje submarino', 1870, 'Juvenil', 450, 'Infantil'],
    ['La vuelta al mundo en ochenta días', 1872, 'Juvenil', 260, 'Infantil'],
  ]],
  ['Robert Louis Stevenson', 'Escocesa', 1850, 1894, false, ['Novela de aventuras'], [['La isla del tesoro', 1883, 'Juvenil', 280, 'Infantil']]],
  ['Lewis Carroll', 'Británica', 1832, 1898, false, ['Literatura infantil'], [['Alicia en el país de las maravillas', 1865, 'Infantil', 160, 'Infantil']]],
  ['Charles Dickens', 'Británica', 1812, 1870, false, ['Novela'], [
    ['Oliver Twist', 1838, 'Literatura universal', 520],
    ['Cuento de Navidad', 1843, 'Juvenil', 120, 'Infantil'],
  ]],
  ['J. R. R. Tolkien', 'Británica', 1892, 1973, false, ['Fantasía'], [
    ['El hobbit', 1937, 'Juvenil', 310, 'Infantil'],
    ['El señor de los anillos', 1954, 'Literatura universal', 1200],
  ]],
  ['J. K. Rowling', 'Británica', 1965, null, false, ['Fantasía'], [['Harry Potter y la piedra filosofal', 1997, 'Juvenil', 260, 'Infantil']]],
  ['Michael Ende', 'Alemana', 1929, 1995, false, ['Fantasía'], [
    ['Momo', 1973, 'Juvenil', 280, 'Infantil'],
    ['La historia interminable', 1979, 'Juvenil', 420, 'Infantil'],
  ]],
  ['Roald Dahl', 'Británica', 1916, 1990, false, ['Literatura infantil'], [
    ['Matilda', 1988, 'Infantil', 240, 'Infantil'],
    ['Charlie y la fábrica de chocolate', 1964, 'Infantil', 190, 'Infantil'],
  ]],
  ['Ray Bradbury', 'Estadounidense', 1920, 2012, false, ['Ciencia ficción'], [['Fahrenheit 451', 1953, 'Literatura universal', 200]]],
  ['Aldous Huxley', 'Británica', 1894, 1963, false, ['Novela'], [['Un mundo feliz', 1932, 'Literatura universal', 260]]],
  ['Hermann Hesse', 'Alemana', 1877, 1962, false, ['Novela'], [
    ['Siddhartha', 1922, 'Literatura universal', 160],
    ['El lobo estepario', 1927, 'Literatura universal', 260],
  ]],
  ['Umberto Eco', 'Italiana', 1932, 2016, false, ['Novela', 'Ensayo'], [['El nombre de la rosa', 1980, 'Literatura universal', 600]]],
  ['Ana Frank', 'Alemana', 1929, 1945, false, ['Diario'], [['El diario de Ana Frank', 1947, 'Biografía', 340]]],
  ['Haruki Murakami', 'Japonesa', 1949, null, false, ['Novela'], [['Tokio blues', 1987, 'Literatura universal', 380]]],
  ['Paulo Coelho', 'Brasileña', 1947, null, false, ['Novela'], [['El alquimista', 1988, 'Literatura universal', 190]]],
  ['Isaac Asimov', 'Estadounidense', 1920, 1992, false, ['Ciencia ficción', 'Divulgación'], [
    ['Yo, robot', 1950, 'Literatura universal', 250],
    ['Fundación', 1951, 'Literatura universal', 260],
  ]],
  ['Arthur Conan Doyle', 'Británica', 1859, 1930, false, ['Novela policiaca'], [['Estudio en escarlata', 1887, 'Literatura universal', 180]]],
  ['Charles Darwin', 'Británica', 1809, 1882, false, ['Ciencia'], [['El origen de las especies', 1859, 'Ciencias', 520]]],
  ['Stephen Hawking', 'Británica', 1942, 2018, false, ['Divulgación científica'], [['Breve historia del tiempo', 1988, 'Ciencias', 250]]],
  ['Carl Sagan', 'Estadounidense', 1934, 1996, false, ['Divulgación científica'], [['Cosmos', 1980, 'Ciencias', 370]]],
  ['Yuval Noah Harari', 'Israelí', 1976, null, false, ['Historia', 'Divulgación'], [['Sapiens. De animales a dioses', 2011, 'Historia', 500]]],
  ['Viktor Frankl', 'Austriaca', 1905, 1997, false, ['Psicología'], [['El hombre en busca de sentido', 1946, 'Psicología', 160]]],
  ['Erich Fromm', 'Alemana', 1900, 1980, false, ['Psicología', 'Filosofía'], [['El arte de amar', 1956, 'Psicología', 140]]],
  ['Friedrich Nietzsche', 'Alemana', 1844, 1900, false, ['Filosofía'], [['Así habló Zaratustra', 1883, 'Filosofía', 420]]],
  ['René Descartes', 'Francesa', 1596, 1650, false, ['Filosofía'], [['Discurso del método', 1637, 'Filosofía', 120]]],
  ['Platón', 'Griega', null, null, false, ['Filosofía'], [['La República', null, 'Filosofía', 480]]],
  ['Aurelio Baldor', 'Cubana', 1906, 1978, false, ['Matemáticas'], [['Álgebra', 1941, 'Matemáticas', 580, 'Consulta']]],
  ['Ernst Gombrich', 'Austriaca', 1909, 2001, false, ['Historia del arte'], [
    ['La historia del arte', 1950, 'Arte', 690],
    ['Breve historia del mundo', 1936, 'Historia', 300],
  ]],
  ['Adam Smith', 'Escocesa', 1723, 1790, false, ['Economía'], [['La riqueza de las naciones', 1776, 'Economía', 800]]],
  ['Thomas Piketty', 'Francesa', 1971, null, false, ['Economía'], [['El capital en el siglo XXI', 2013, 'Economía', 680]]],
  ['Real Academia Española', 'Española', null, null, false, ['Obras de consulta'], [
    ['Diccionario de la lengua española', 2014, 'Consulta', 2400, 'Consulta'],
    ['Ortografía de la lengua española', 2010, 'Consulta', 740, 'Consulta'],
  ]],
  ['Congreso Constituyente de 1917', 'Mexicana', null, null, false, ['Derecho'], [
    ['Constitución Política de los Estados Unidos Mexicanos', 1917, 'Derecho', 280, 'Consulta'],
  ]],
];

// Temas para generar títulos de no ficción y del Fondo Nayarita.
export const TEMAS_NO_FICCION = {
  Ciencias: ['Biología', 'Química', 'Física', 'Ecología', 'Astronomía', 'Genética', 'Botánica', 'Zoología', 'Geología', 'Oceanografía'],
  Matemáticas: ['Aritmética', 'Geometría', 'Trigonometría', 'Cálculo diferencial', 'Probabilidad y estadística', 'Álgebra lineal', 'Matemáticas financieras'],
  Tecnología: ['Programación', 'Electrónica', 'Redes de computadoras', 'Bases de datos', 'Energías renovables', 'Agricultura tecnificada', 'Robótica'],
  Salud: ['Nutrición', 'Primeros auxilios', 'Salud mental', 'Anatomía humana', 'Cuidado del adulto mayor', 'Salud materno-infantil'],
  Geografía: ['Geografía de México', 'Climatología', 'Cartografía', 'Geografía física', 'Recursos naturales de México'],
  Derecho: ['Derecho civil', 'Derecho laboral', 'Derecho constitucional', 'Derechos humanos', 'Derecho agrario'],
  Economía: ['Microeconomía', 'Macroeconomía', 'Finanzas personales', 'Economía mexicana', 'Emprendimiento'],
  Arte: ['Muralismo mexicano', 'Fotografía', 'Dibujo', 'Música tradicional mexicana', 'Teatro', 'Arte huichol'],
  Historia: ['Historia de México', 'La Revolución mexicana', 'La Independencia de México', 'Mesoamérica', 'Historia universal', 'La Reforma'],
  Psicología: ['Psicología del desarrollo', 'Inteligencia emocional', 'Psicología educativa', 'Psicología social'],
  Filosofía: ['Ética', 'Lógica', 'Filosofía mexicana', 'Introducción a la filosofía'],
  Consulta: ['Atlas de México', 'Enciclopedia temática', 'Diccionario de sinónimos', 'Diccionario inglés-español', 'Atlas universal'],
};

export const ENFOQUES = [
  'conceptos básicos', 'para bachillerato', 'un enfoque práctico', 'teoría y ejercicios',
  'guía de estudio', 'manual del estudiante', 'introducción', 'para todos', 'casos de México', 'edición actualizada',
];

export const TITULOS_NAYARIT = [
  'Historia de Nayarit', 'Tepic: crónica de una ciudad', 'La Revolución en Nayarit', 'El pueblo wixárika de Nayarit',
  'Los náayeri de la Sierra del Nayar', 'Mexcaltitán: isla, origen y leyenda', 'El puerto de San Blas en el siglo XVIII',
  'Manuel Lozada y la Sierra de Álica', 'El tabaco en la historia de Nayarit', 'Arquitectura del centro histórico de Tepic',
  'Gastronomía nayarita', 'Leyendas de Nayarit', 'Nayarit: geografía y recursos', 'La Mesa del Nayar',
  'Santiago Ixcuintla y la costa norte', 'Compostela, ciudad virreinal', 'Ixtlán del Río y la zona arqueológica de Los Toriles',
  'El séptimo cantón de Jalisco', 'Fiestas y tradiciones de Nayarit', 'Mujeres en la historia de Nayarit',
];

export const TITULOS_INFANTILES = {
  personajes: ['El jaguar', 'La tortuga', 'El colibrí', 'La iguana', 'El tlacuache', 'La ballena', 'El venado azul', 'La guacamaya', 'El ajolote', 'La luciérnaga', 'El búho', 'La mariposa monarca'],
  acciones: ['que no sabía nadar', 'que quería volar', 'y el río de estrellas', 'que contaba cuentos', 'perdido en la sierra', 'y la isla del tesoro', 'que soñaba con el mar', 'y sus amigos del bosque', 'que aprendió a leer', 'y la noche más larga'],
};

export const EDITORIALES = {
  mx: ['Fondo de Cultura Económica', 'Editorial Era', 'Siglo XXI Editores', 'Editorial Porrúa', 'Planeta Mexicana', 'Penguin Random House México', 'Alfaguara', 'Ediciones SM', 'Editorial Trillas', 'Editorial Limusa', 'Grupo Editorial Patria', 'Ediciones Castillo'],
  es: ['Anagrama', 'Cátedra', 'Tusquets Editores', 'Alianza Editorial', 'Espasa', 'Salamandra'],
  ar: ['Sudamericana', 'Emecé', 'Eudeba'],
  nay: ['Universidad Autónoma de Nayarit', 'Consejo Estatal para la Cultura y las Artes de Nayarit', 'Gobierno del Estado de Nayarit'],
};
