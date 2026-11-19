const crypto = { randomUUID: () => Utilities.getUuid() };
function clean(v, max = 2e3) {
  return String(v ?? "").trim().slice(0, max);
}
function assert(c, m) {
  if (!c) throw new Error(m);
}
const mentorKeys = ["name", "college", "department", "category", "organization", "position", "phone", "expertise", "description", "availability", "connection", "alumni", "field", "note"];
function mentorInput(input, previous = {}) {
  const x = { ...previous };
  for (const k of mentorKeys) if (k in input) x[k] = clean(input[k], k === "description" || k === "expertise" ? 2500 : 500);
  x.id = clean(input.id || previous.id, 80);
  x.supportStages = Array.isArray(input.supportStages) ? input.supportStages.filter((s) => ["\uD0D0\uC0C9", "\uC124\uACC4", "\uC900\uBE44\xB7\uC2E4\uD589", "\uC9C4\uCD9C", "\uC801\uC751\xB7\uD658\uB958"].includes(s)) : previous.supportStages || [];
  x.fieldReviewed = !!input.fieldReviewed;
  x.formatConfirmed = !!input.formatConfirmed;
  x.formats = Array.isArray(input.formats) ? input.formats.filter((v) => ["1:1", "\uC18C\uADF8\uB8F9", "1:\uB2E4\uC218", "\uD604\uC7A5\uD0D0\uBC29", "\uD2B9\uAC15", "\uD504\uB85C\uC81D\uD2B8"].includes(v)) : previous.formats || [];
  x.published = input.published === void 0 ? previous.published !== false : !!input.published;
  x.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  assert(x.name && x.department && x.organization, "\uC131\uBA85\xB7\uD559\uACFC\xB7\uC18C\uC18D\uAE30\uAD00\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694.");
  assert(["\uAC00\uB2A5", "\uD655\uC778 \uD544\uC694", "\uC5B4\uB824\uC6C0"].includes(x.availability), "\uCC38\uC5EC \uC0C1\uD0DC\uB97C \uD655\uC778\uD574 \uC8FC\uC138\uC694.");
  return x;
}
const aliases = { "\uBA58\uD1A0 ID": "id", "\uBA58\uD1A0 ID*": "id", "\uC131\uBA85": "name", "\uC131\uBA85*": "name", "\uB2E8\uACFC\uB300\uD559": "college", "\uD559\uACFC(\uBD80)": "department", "\uD559\uACFC": "department", "\uCD94\uCC9C \uD559\uACFC\xB7\uBD80\uC11C*": "department", "\uBA58\uD1A0 \uBD84\uC57C": "category", "\uC18C\uC18D\uAE30\uAD00": "organization", "\uC18C\uC18D\uAE30\uAD00*": "organization", "\uC9C1\uAE09\xB7\uC9C1\uC704": "position", "\uC5F0\uB77D\uCC98": "phone", "\uC5F0\uB77D\uCC98(\uAD00\uB9AC\uC6A9)": "phone", "\uC8FC\uC694 \uACBD\uB825\xB7\uC804\uBB38\uBD84\uC57C": "expertise", "\uBA58\uD1A0\uB9C1 \uAC00\uB2A5 \uB0B4\uC6A9": "description", "\uCC38\uC5EC \uAC00\uB2A5 \uC5EC\uBD80": "availability", "\uC5F0\uACC4 \uD604\uD669": "connection", "\uB3D9\uBB38 \uC5EC\uBD80": "alumni", "\uC8FC \uC9C0\uC6D0 \uBD84\uC57C": "field", "\uBE44\uACE0": "note" };
function importPlan(state, rows, mode) {
  assert(Array.isArray(rows) && rows.length > 0 && rows.length <= 3e3, "CSV\uB294 1~3,000\uD589\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694.");
  const result = [...state.mentors];
  const summary = { added: 0, updated: 0, skipped: 0, errors: [], conflicts: [] };
  const seen = /* @__PURE__ */ new Set();
  for (let i = 0; i < rows.length; i++) {
    try {
      const r = {};
      for (const [k, v] of Object.entries(rows[i])) {
        const key = aliases[k.replace(/^\uFEFF/, "").trim()] || k;
        if ([...mentorKeys, "id"].includes(key) && clean(v)) r[key] = clean(v);
      }
      if (!r.name) continue;
      const identity = [r.name, r.organization, r.department].join("|");
      assert(!seen.has(identity), "\uD30C\uC77C \uB0B4 \uB3D9\uC77C \uBA58\uD1A0\uAC00 \uC911\uBCF5\uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
      seen.add(identity);
      const matches = result.filter((m) => r.id ? m.id === r.id : m.name === r.name && m.organization === r.organization && m.department === r.department);
      assert(matches.length <= 1, "\uC77C\uCE58 \uD6C4\uBCF4\uAC00 \uC5EC\uB7EC \uBA85\uC785\uB2C8\uB2E4. ID\uB97C \uC9C0\uC815\uD574 \uC8FC\uC138\uC694.");
      const old = matches[0];
      if (old && r.id) assert(old.name === r.name, "\uB3D9\uC77C ID\uC5D0 \uB2E4\uB978 \uC131\uBA85\uC774 \uC788\uC2B5\uB2C8\uB2E4.");
      if (old && mode === "skip") {
        summary.skipped++;
        continue;
      }
      if (!old) {
        assert(!r.id || !r.id.startsWith("\uC608\uC2DC"), "\uC608\uC2DC ID\uB294 \uB4F1\uB85D\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
        r.id = r.id || "M-" + crypto.randomUUID().slice(0, 12);
        r.availability = r.availability || "\uD655\uC778 \uD544\uC694";
        r.category = r.category || "\uAE30\uD0C0";
        r.field = r.field || "\uC9C4\uB85C";
        r.alumni = r.alumni || "\uD655\uC778 \uD544\uC694";
        r.connection = r.connection || "\uC2E0\uADDC \uD6C4\uBCF4";
      }
      if (["\uAE30\uC874", "\uAE34\uC874"].includes(r.connection)) {
        if (r.connection === "\uAE34\uC874") r.note = (r.note || "") + " [\uAE30\uC874 \uBD84\uB958 \uC624\uD0C0 \uD655\uC778 \uD544\uC694]";
        r.connection = "\uAE30\uC874 \uC5F0\uACC4";
      }
      if (["\uC2E0\uADDC", "\uC2E0\uADDC\uD6C4\uBCF4"].includes(r.connection)) r.connection = "\uC2E0\uADDC \uD6C4\uBCF4";
      if (old) for (const k of mentorKeys) {
        if (r[k] && r[k] !== old[k]) summary.conflicts.push(`${r.name}: ${k}`);
      }
      const merged = mentorInput({ ...old, ...r, fieldReviewed: false }, old);
      if (old) {
        result[result.indexOf(old)] = merged;
        summary.updated++;
      } else {
        result.push(merged);
        summary.added++;
      }
    } catch (e) {
      summary.errors.push(`${i + 2}\uD589: ${e.message}`);
    }
  }
  return { mentors: result, summary };
}
