const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
// Build a fast reference counter for every CamelCase/bare identifier and
// report those that look like components/imports but never appear in a
// "function/const" definition within this file.
const defs = new Set();
for (const m of src.matchAll(/(?:export\s+)?(?:default\s+)?(?:function|const)\s+(\w+)/g)) defs.add(m[1]);
const used = new Set();
for (const m of src.matchAll(/\b([A-Z][A-Za-z0-9_]*)\b/g)) used.add(m[1]);
const suspicious = [...used].filter(n =>
  !defs.has(n) &&
  !["React", "COLORS", "FONTS", "RADIUS", "SPACE", "VIEW", "Date", "Math", "String", "Number", "Object", "Array", "Promise", "JSON", "setTimeout", "setInterval", "clearTimeout", "clearInterval", "localStorage", "sessionStorage", "navigator", "document", "window", "Event", "Blob", "URL", "HTMLAudioElement", "Audio", "FormData", "FileReader", "Image", "Node", "SupabaseClient", "CSS", "Intl", "URLSearchParams"].includes(n) &&
  !/^(JEE|NEET|IIT|CBSE|UPSC|CAT|AIIMS|KVPY|NTSE|GATE|GRE|SAT|IELTS|TOEFL|VIT|MIT|NIT|BITS|TIFR|ISI|CSE|EEE|ME|CE|BCA|MCA|BSc|BA|BCom|BBA|MBA|PhD|AI|ML|DL|DBMS|OS|COA|DSA|ADA|EVS|PE|CS|IP|PG|UG|GT|EL|CH|PH|MA|BA|RS|PS|HI|EC|MP|SC|BL|GE|HI)$/.test(n));
console.log(suspicious.join("\n"));
