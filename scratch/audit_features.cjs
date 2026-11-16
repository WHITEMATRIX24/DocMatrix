const fs = require('fs');
const content = fs.readFileSync('Doc_matrix-main/src/features/registry.ts', 'utf8');

const regex = /\{\s*"id":\s*"([^"]+)",\s*"name":\s*"([^"]+)",\s*"description":\s*"([^"]+)",\s*"source":\s*"([^"]+)",\s*"phase":\s*"([^"]+)",\s*"area":\s*"([^"]+)",\s*"route":\s*"([^"]+)"(?:,\s*"inNav":\s*(true|false))?(?:,\s*"roles":\s*(\[[^\]]*\]))?/g;

let m;
const features = [];
while ((m = regex.exec(content)) !== null) {
  features.push({
    id: m[1],
    name: m[2],
    description: m[3],
    source: m[4],
    phase: m[5],
    area: m[6],
    route: m[7],
    inNav: m[8],
    roles: m[9]
  });
}

const launch = features.filter(f => f.phase === 'launch');
console.log(`Found ${launch.length} launch features:\n`);
launch.forEach((f, idx) => {
  console.log(`${idx + 1}. [${f.area}] ${f.id} - ${f.name} (${f.route})`);
});
