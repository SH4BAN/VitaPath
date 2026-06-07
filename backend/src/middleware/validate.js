export function validate(rules) {
  return (req, _res, next) => {
    const errors = [];
    for (const [field, checks] of Object.entries(rules)) {
      const value = req.body[field];
      if (checks.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }
      if (value === undefined || value === null || value === '') continue;
      if (checks.type === 'string' && typeof value !== 'string') errors.push(`${field} must be a string`);
      if (checks.type === 'date' && Number.isNaN(Date.parse(value))) errors.push(`${field} must be a valid date`);
      if (checks.enum && !checks.enum.includes(value)) errors.push(`${field} must be one of: ${checks.enum.join(', ')}`);
      if (checks.minLength && String(value).length < checks.minLength) errors.push(`${field} is too short`);
    }

    if (errors.length > 0) {
      const error = new Error('Validation failed');
      error.status = 400;
      error.details = errors;
      return next(error);
    }
    return next();
  };
}
