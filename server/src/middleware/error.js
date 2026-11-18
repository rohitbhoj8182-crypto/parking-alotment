const DUP_MESSAGES = {
  vehicleNumber: 'This vehicle is already parked',
  slot: 'This slot was just taken',
  email: 'This email is already registered',
  code: 'A slot with this code already exists',
  name: 'A parking with this name already exists',
};

module.exports = (err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message;

  if (err.code === 11000) {
    status = 409;
    message = DUP_MESSAGES[Object.keys(err.keyPattern || {})[0]] || 'Duplicate value';
  } else if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid id';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid JSON';
  }

  if (status >= 500) { console.error(err); message = 'Something went wrong on our side'; }
  res.status(status).json({ message });
};
