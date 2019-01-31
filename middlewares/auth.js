function isLoggedIn(request, response, next) {
  // passport adds this to the request object
  if (request.isAuthenticated('jwt')) {
    return next();
  }
  response.status(400).send({message: 'Not Authorized'});
}

module.exports = isLoggedIn;