import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const duty = require('../api/duty.js');
const { parsePageContext, parseRows, parseCoordinates, normalizeText, distanceMeters } = duty._private;

const context = parsePageContext(`
  <body data-token="abc123">
    <input type="radio" name="nobetTarihi" value="29/09/2026" />
    <input type="radio" name="nobetTarihi" value="30/09/2026" />
  </body>
`);
assert.equal(context.token, 'abc123');
assert.deepEqual(context.dates, ['29/09/2026', '30/09/2026']);

const rows = parseRows(`
  <table id="searchTable"><tbody>
    <tr><td>SERİK</td><td>Örnek Eczanesi</td><td>Kadriye Mah. No: 1</td><td>0242 000 00 00</td></tr>
  </tbody></table>
`);
assert.equal(rows.length, 1);
assert.equal(rows[0].district, 'SERİK');
assert.equal(rows[0].name, 'Örnek Eczanesi');
assert.equal(rows[0].phone, '02420000000');

assert.deepEqual(
  parseCoordinates('var latti = parseFloat(36.875); var longi = parseFloat(31.100);'),
  { latitude: 36.875, longitude: 31.1 },
);
assert.equal(normalizeText('ŞANLIURFA'), 'sanliurfa');
assert.ok(distanceMeters(36.86, 31.10, 36.87, 31.11) > 1000);

console.log('duty parser tests passed');
