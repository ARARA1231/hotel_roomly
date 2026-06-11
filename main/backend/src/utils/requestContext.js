function getRequestContext(req) {
  return {
    user: req.user || null,
    ip: req.ip || req.headers['x-forwarded-for'] || null,
    userAgent: req.headers['user-agent'] || null
  };
}

module.exports = { getRequestContext };
