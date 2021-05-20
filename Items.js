const itemsCollection = require('../db').db().collection("items")
const ObjectID = require('mongodb').ObjectID
const User = require('./User')
const sanitizeHTML = require('sanitize-html')

let Item = function(data, userid, requestedItemId) {
  this.data = data
  this.errors = []
  this.userid = userid
  this.requestedItemId = requestedItemId
}

Item.prototype.cleanUp = function() {
  if (typeof(this.data.title) != "string") {this.data.title = ""}
  if (typeof(this.data.body) != "string") {this.data.body = ""}

  // get rid of any bogus properties
  this.data = {
    title: sanitizeHTML(this.data.title.trim(), {allowedTags: [], allowedAttributes: {}}),
    body: sanitizeHTML(this.data.body.trim(), {allowedTags: [], allowedAttributes: {}}),
    createdDate: new Date(),
    author: ObjectID(this.userid)
  }
}

Item.prototype.validate = function() {
  if (this.data.title == "") {this.errors.push("You must provide a title.")}
  if (this.data.body == "") {this.errors.push("You must provide item content.")}
}

Item.prototype.create = function() {
  return new Promise((resolve, reject) => {
    this.cleanUp()
    this.validate()
    if (!this.errors.length) {
      // save item into database
      itemsCollection.insertOne(this.data).then((info) => {
        resolve(info.ops[0]._id)
      }).catch(() => {
        this.errors.push("Please try again later.")
        reject(this.errors)
      })
    } else {
      reject(this.errors)
    }
  })
}

Item.prototype.update = function() {
  return new Promise(async (resolve, reject) => {
    try {
      let item = await I.findSingleById(this.requestedItemId, this.userid)
      if (item.isVisitorOwner) {
        // actually update the db
        let status = await this.actuallyUpdate()
        resolve(status)
      } else {
        reject()
      }
    } catch {
      reject()
    }
  })
}

Item.prototype.actuallyUpdate = function() {
  return new Promise(async (resolve, reject) => {
    this.cleanUp()
    this.validate()
    if (!this.errors.length) {
      await itemsCollection.findOneAndUpdate({_id: new ObjectID(this.requestedItemId)}, {$set: {title: this.data.title, body: this.data.body}})
      resolve("success")
    } else {
      resolve("failure")
    }
  })
}

Item.reusableItemQuery = function(uniqueOperations, visitorId) {
  return new Promise(async function(resolve, reject) {
    let aggOperations = uniqueOperations.concat([
      {$lookup: {from: "users", localField: "author", foreignField: "_id", as: "authorDocument"}},
      {$project: {
        title: 1,
        body: 1,
        createdDate: 1,
        authorId: "$author",
        author: {$arrayElemAt: ["$authorDocument", 0]}
      }}
    ])

    let items = await itemsCollection.aggregate(aggOperations).toArray()

    // clean up author property in each item object
    items = items.map(function(item) {
      item.isVisitorOwner = item.authorId.equals(visitorId)

      item.author = {
        username: item.author.username,
        avatar: new User(item.author, true).avatar
      }

      return item
    })

    resolve(items)
  })
}

Item.findSingleById = function(id, visitorId) {
  return new Promise(async function(resolve, reject) {
    if (typeof(id) != "string" || !ObjectID.isValid(id)) {
      reject()
      return
    }
    
    let items = await Item.reusableItemQuery([
      {$match: {_id: new ObjectID(id)}}
    ], visitorId)

    if (items.length) {
      console.log(items[0])
      resolve(items[0])
    } else {
      reject()
    }
  })
}

Item.findByAuthorId = function(authorId) {
  return Item.reusableItemQuery([
    {$match: {author: authorId}},
    {$sort: {createdDate: -1}}
  ])
}

Item.delete = function(itemIdToDelete, currentUserId) {
  return new Promise(async (resolve, reject) => {
    try {
      let item = await Item.findSingleById(itemIdToDelete, currentUserId)
      if (item.isVisitorOwner) {
        await itemsCollection.deleteOne({_id: new ObjectID(itemIdToDelete)})
        resolve()
      } else {
        reject()
      }    
    } catch {
      reject()
    }
  })
}

module.exports = Item