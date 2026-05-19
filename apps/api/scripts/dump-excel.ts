// Mini script de análisis: vuelca la estructura de un Excel a stdout.
// Uso: tsx apps/api/scripts/dump-excel.ts <path-al-xlsx>
//
// Imprime: hojas, dimensiones, primera fila (headers), filas 2-6 como sample.
import * as XLSX from 'xlsx';

const file = process.argv[2];
if (!file) {
  console.error('Uso: tsx dump-excel.ts <archivo.xlsx>');
  process.exit(1);
}

const wb = XLSX.readFile(file);

console.log('=== ARCHIVO:', file);
console.log('Hojas:', wb.SheetNames.length);
console.log();

for (const sheetName of wb.SheetNames) {
  const sheet = wb.Sheets[sheetName];
  const ref = sheet['!ref'] ?? '';
  const range = XLSX.utils.decode_range(ref || 'A1:A1');
  const cols = range.e.c - range.s.c + 1;
  const rows = range.e.r - range.s.r + 1;

  console.log(`--- Hoja: "${sheetName}" (${rows} filas × ${cols} columnas, ref=${ref})`);

  // Volcamos como array de arrays para ver structure literal
  const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: null,
  });

  // Mostrar las primeras 15 filas para entender estructura
  const sample = data.slice(0, 15);
  sample.forEach((row, idx) => {
    const cells = (row as unknown[]).map((c) =>
      c === null || c === undefined ? '·' : String(c).slice(0, 30),
    );
    console.log(`  [${idx}]`, JSON.stringify(cells));
  });

  if (data.length > 15) {
    console.log(`  ... (${data.length - 15} filas más)`);
  }
  console.log();
}
