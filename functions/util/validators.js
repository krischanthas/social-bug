const isEmpty = (string) => {
      if(string.trim() === '') {
            return true;
      } else  {
            return false;
      }
}
const isEmail = (email) => {
      const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      if(email.match(regEx)) {
            return true;
      }
}

exports.validateSignUpData = (data) => {
        /* New user validation */
        let errors = {}; // initialize errors object
        if(isEmpty(data.email)) {
              errors.email = 'Must not be empty';
        } else if (!isEmail(data.email)) {
              errors.email = 'Must be a valid email address';
        }
        if(isEmpty(data.password)) errors.password = 'Must not by empty';
        if(data.password !== data.confirmPassword) errors.confirmPassword = 'Passwords must match';
        if(isEmpty(data.handle)) errors.handle = 'Must not be empty';
        // return errors object if errors exist

        return {
            errors,
            valid: Object.keys(errors).length  === 0 ? true : false
        }
};

exports.validateLogIn = (data) => {
      let errors = {};
      if(isEmpty(data.email)){
            errors.email = 'Must not be empty';
      } else if(!isEmail(data.email)) {
            errors.email = 'Must be valid email address';
      } 
      if(isEmpty(data.password)) return errors.password = 'Must not be empty';
      if(Object.keys(errors).length > 0) return response.status(400).json(errors);

      return {
            errors,
            valid: Object.keys(errors).length === 0 ? true : false
      }
};

exports.reduceUserDetails = (data => {
      let userDetails = {};
      if(!isEmpty(data.bio.trim())) {
            userDetails.bio = data.bio;
      }

      if(!isEmpty(data.website.trim())) {
            //http://website.com
            if(data.website.trim().substring(0,4) !== 'http') {
                  userDetails.website =  `http://${data.website.trim()}`;
            } else {
                  userDetails.website = data.website;
            }
      }
      if(!isEmpty(data.location.trim())) {
            userDetails.location = data.location;
      } 
      
      return userDetails;
});