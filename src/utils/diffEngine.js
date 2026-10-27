import { CHANGE_TYPES } from '../constants/sampleData';

function getExactType(val) {
  if (val === null) return 'null';
  if (Array.isArray(val)) return 'array';
  return typeof val;
}

export function matchesPathRule(currentPath, rulePattern) {
  if (!currentPath || !rulePattern) return false;

  // Normalize so every path begins with a single "$" root (handles both
  // "$.foo.bar" and "$[0].foo" styles without doubling the prefix).
  const normalize = (p) => (p.startsWith('$') ? p : `$${p}`);
  const cleanCurrent = normalize(currentPath);
  const cleanRule = normalize(rulePattern);

  if (cleanCurrent === cleanRule) return true;

  // Single word match fallback (e.g. "userId" anywhere in path)
  if (!rulePattern.includes('.') && !rulePattern.includes('[')) {
    const segments = cleanCurrent.replace(/\[\d+\]/g, '').split('.');
    if (segments.includes(rulePattern)) return true;
  }

  // Wildcard converter: $[*].userId -> ^\$\[\d+\]\.userId$
  try {
    const escaped = cleanRule
      .replace(/\./g, '\\.')
      .replace(/\[\*\]/g, '\\[\\d+\\]')
      .replace(/\*/g, '[^.]+');
    const rx = new RegExp(`^${escaped}$`);
    return rx.test(cleanCurrent);
  } catch {
    return false;
  }
}

export function compareJson(baseline, updated, ignoreRules = [], basePath = '$') {
  let differences = [];

  const isIgnored = ignoreRules.some((rule) => matchesPathRule(basePath, rule));
  if (isIgnored) return differences;

  if (Object.is(baseline, updated)) return differences;

  const bType = getExactType(baseline);
  const uType = getExactType(updated);

  if (bType !== uType) {
    differences.push({
      path: basePath,
      type: CHANGE_TYPES.TYPE_CHANGED,
      oldValue: baseline,
      newValue: updated,
      oldType: bType,
      newType: uType,
      isRisk: true,
      riskReason: `Type drift from [${bType}] to [${uType}]. Components expecting ${bType} properties or methods will fail.`
    });
    return differences;
  }

  if (bType !== 'object' && bType !== 'array') {
    if (baseline !== updated) {
      differences.push({
        path: basePath,
        type: CHANGE_TYPES.MODIFIED,
        oldValue: baseline,
        newValue: updated,
        oldType: bType,
        newType: uType,
        isRisk: false
      });
    }
    return differences;
  }

  if (bType === 'array') {
    const maxLen = Math.max(baseline.length, updated.length);
    for (let i = 0; i < maxLen; i++) {
      const itemPath = `${basePath}[${i}]`;
      const itemIgnored = ignoreRules.some((rule) => matchesPathRule(itemPath, rule));
      if (itemIgnored) continue;

      if (i >= baseline.length) {
        differences.push({
          path: itemPath,
          type: CHANGE_TYPES.ADDED,
          oldValue: undefined,
          newValue: updated[i],
          oldType: 'undefined',
          newType: getExactType(updated[i]),
          isRisk: false
        });
      } else if (i >= updated.length) {
        differences.push({
          path: itemPath,
          type: CHANGE_TYPES.REMOVED,
          oldValue: baseline[i],
          newValue: undefined,
          oldType: getExactType(baseline[i]),
          newType: 'undefined',
          isRisk: true,
          riskReason: 'Array length decreased. Zero-indexed element accesses may evaluate to undefined.'
        });
      } else {
        differences = differences.concat(
          compareJson(baseline[i], updated[i], ignoreRules, itemPath)
        );
      }
    }
    return differences;
  }

  if (bType === 'object') {
    const bKeys = Object.keys(baseline);
    const uKeys = Object.keys(updated);
    const allKeys = Array.from(new Set([...bKeys, ...uKeys]));

    for (const key of allKeys) {
      const propPath = basePath === '$' ? `$.${key}` : `${basePath}.${key}`;
      const propIgnored = ignoreRules.some((rule) => matchesPathRule(propPath, rule));
      if (propIgnored) continue;

      const inBaseline = Object.prototype.hasOwnProperty.call(baseline, key);
      const inUpdated = Object.prototype.hasOwnProperty.call(updated, key);

      if (inBaseline && !inUpdated) {
        differences.push({
          path: propPath,
          type: CHANGE_TYPES.REMOVED,
          oldValue: baseline[key],
          newValue: undefined,
          oldType: getExactType(baseline[key]),
          newType: 'undefined',
          isRisk: true,
          riskReason: `Property [${key}] was deleted. Frontend code accessing response.${key} without optional chaining will throw ReferenceError.`
        });
      } else if (!inBaseline && inUpdated) {
        differences.push({
          path: propPath,
          type: CHANGE_TYPES.ADDED,
          oldValue: undefined,
          newValue: updated[key],
          oldType: 'undefined',
          newType: getExactType(updated[key]),
          isRisk: false
        });
      } else {
        differences = differences.concat(
          compareJson(baseline[key], updated[key], ignoreRules, propPath)
        );
      }
    }
  }

  return differences;
}

export function safeParse(str) {
  if (!str || typeof str !== 'string' || !str.trim()) {
    return { data: null, error: null };
  }
  try {
    const data = JSON.parse(str.trim());
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

/**
 * Recursively walks a parsed JSON object and collects every property path
 * (e.g. "$.id", "$.profile.city", "$.profile.skills"). Used to surface
 * dynamic, context-aware "Ignore Rules" quick toggles.
 */
export function extractJsonKeys(obj, prefix = '$') {
  const keys = [];
  if (!obj || typeof obj !== 'object') return keys;

  if (Array.isArray(obj)) {
    if (obj.length > 0) {
      keys.push(...extractJsonKeys(obj[0], `${prefix}[*]`));
    }
    return keys;
  }

  for (const key of Object.keys(obj)) {
    const path = `${prefix}.${key}`;
    keys.push(path);
    keys.push(...extractJsonKeys(obj[key], path));
  }
  return keys;
}
