// The shipped schemas use this deliberately small JSON Schema subset. Unknown
// keywords are rejected so adding a schema rule cannot silently weaken checks.
const keywords = new Set(['$schema', '$id', 'title', 'description', 'type', 'const', 'enum', 'properties', 'required', 'additionalProperties', 'items', 'minItems', 'uniqueItems', 'minLength', 'pattern', 'minimum', 'maximum', 'anyOf'])
export function validate(value, schema, path = '$') {
  const errors = []
  for (const key of Object.keys(schema)) if (!keywords.has(key)) throw new Error(`Unsupported schema keyword: ${key}`)
  if (schema.anyOf && !schema.anyOf.some(option => validate(value, option, path).length === 0)) return [`${path}: does not match any allowed shape`]
  if ('const' in schema && value !== schema.const) errors.push(`${path}: expected ${JSON.stringify(schema.const)}`)
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${path}: expected one of ${schema.enum.join(', ')}`)
  const types = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : []
  const isType = type => type === 'null' ? value === null : type === 'array' ? Array.isArray(value) : type === 'object' ? value !== null && typeof value === 'object' && !Array.isArray(value) : type === 'integer' ? Number.isInteger(value) : typeof value === type
  if (types.length && !types.some(isType)) return [...errors, `${path}: expected ${types.join(' or ')}`]
  if (typeof value === 'string') {
    if (schema.minLength != null && value.trim().length < schema.minLength) errors.push(`${path}: must not be empty`)
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errors.push(`${path}: invalid format`)
  }
  if (typeof value === 'number') {
    if (schema.minimum != null && value < schema.minimum) errors.push(`${path}: below minimum`)
    if (schema.maximum != null && value > schema.maximum) errors.push(`${path}: above maximum`)
  }
  if (Array.isArray(value)) {
    if (schema.minItems != null && value.length < schema.minItems) errors.push(`${path}: too few items`)
    if (schema.uniqueItems && new Set(value.map(item => JSON.stringify(item))).size !== value.length) errors.push(`${path}: duplicate items`)
    if (schema.items) value.forEach((item, i) => errors.push(...validate(item, schema.items, `${path}[${i}]`)))
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of schema.required || []) if (!Object.hasOwn(value, key)) errors.push(`${path}.${key}: required`)
    for (const [key, item] of Object.entries(value)) {
      if (Object.hasOwn(schema.properties || {}, key)) errors.push(...validate(item, schema.properties[key], `${path}.${key}`))
      else if (schema.additionalProperties === false) errors.push(`${path}.${key}: unknown field`)
      else if (typeof schema.additionalProperties === 'object') errors.push(...validate(item, schema.additionalProperties, `${path}.${key}`))
    }
  }
  return errors
}
