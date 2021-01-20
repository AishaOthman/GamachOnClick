const validator = require("validator")

let User  = function(data){
    this.data = data
    this.errors = []
}

User.prototype.validate = function(){
    if (this.data.username==='') {this.errors.push("you must provide a username.")}
    if (this.data.username != "" && !validator.isAlphanumeric(this.data.username)) {this.errors.push(" username can only contain letters and anumbers. ")}
    if (!validator.isEmail(this.data.email)) {this.errors.push("you must provide a valid email address.")}
    if (this.data.password==='') {this.errors.push("you must provide a password.")}
    if (this.data.password.length > 0 && this.data.password.length <12) {this.errors.push("password musrt be 12 carecters.")}
    if (this.data.password.length > 100) {this.errors.push("password connot exceed 100 carecters.")}
    if (this.data.username.length > 0 && this.data.password.length <3) {this.errors.push("username musrt be 3 carecters.")}
    if (this.data.username.length > 30) {this.errors.push("username connot exceed 30 carecters.")}
    
}
User.prototype.register = function(){
    // step #1: validate user data
    this.validate()
    // step#2 : only if there are no validation errore 
    //then save the user data into a database
}

module.exports = Usre