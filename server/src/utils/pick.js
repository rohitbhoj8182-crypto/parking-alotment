module.exports = (obj, keys) => keys.reduce((o, k) => (obj[k] !== undefined ? { ...o, [k]: obj[k] } : o), {});
