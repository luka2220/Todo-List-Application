const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");
const date = require(__dirname + "/date.js");

// Checking environment variables
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// Getting current formatted date from date.js module
const day = date.getDate();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));   // Mounting middleware functions
app.use(express.static("public"));                    // Serving static files
app.set("view engine", "ejs");                        // Looking into /views for EJS files

// Connect to todolistDB (Database)
mongoose.set("strictQuery", false);
mongoose.connect(`mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@todolistdb.gt3atfa.mongodb.net/todolistDB`, {
  useNewUrlParser: true,
});

// Schema for Items and WorkItems collections (Database)
const itemsSchema = new mongoose.Schema({
  name: String
});
// Schema for custom todo list with relationship to itemsSchema (Database)
const listSchema = new mongoose.Schema({
  name: String,
  items: [itemsSchema],
});

const Item = mongoose.model("Items", itemsSchema);          // Initialize Items collection from todolistDB (Database)
const WorkItem = mongoose.model("WorkItems", itemsSchema);  // Initialize WorkItems collection from todolistDB (Database)
const List = mongoose.model("List", listSchema);            // Initialize List collection from todolistDB (Database)

// Add default documetns to Item collection (Database)
const item1 = new Item({
  name: "Welcome to the todolist!"
});

const item2 = new Item({
  name: "Hit + to add a new item."
});

const item3 = new Item({
  name: "<-- Hit this to delete an item."
});

const defaultItems = [item1, item2, item3];

// root page GET route
app.get("/", function (req, res) {

  // Retrieving all the documents from Items collection (Database)
  Item.find({}, function (err, todoItems) {
    if (err) {
      console.log(err);
    } else {
      if (todoItems.length === 0) {

        // If no documents found add the default documents to Items collection 
        Item.insertMany(defaultItems, function(err) {
          if (err) {
            console.log(err);
          } else {
            console.log("Saved default items to db");
          }
        });

        res.redirect("/");
      } else {

        // Rendering ejs file (list.ejs) updated date and DB documents from Items collection
        res.render("list", { listTitle: day, todoList: todoItems });
      }
    }
  });
});

// work page GET route
app.get("/work", function (req, res) {

  // Get all the items in the WorkItems collection (Database)
  WorkItem.find({}, function (err, items) {
    if (err) {
      console.log(err);
    } else {

      // Send the items returned to EJS list template
      res.render("list", { listTitle: "Work List", todoList: items });
    }
  });
});

// Custom todo list defined by routing parameters
app.get("/:customList", function (req, res) {
  const customListName = _.capitalize(req.params.customList);

  // Check if todo list already exists
  List.findOne({ name: customListName }, function (err, list) {
    if (!err && customListName != "Favicon.ico") {
      if (!list) {
        // Creating a new document from List collection (Database)
        const list = new List({
          name: customListName,
          items: []
        });

        // Store document (Database)
        list.save();
        res.redirect(`/${customListName}`);
      } else {
        // Send back existing list (Database)
        res.render("list", { 
          listTitle: list.name, 
          todoList: list.items 
        });
      }
    }
  });
});

// about page GET route
app.get("/about", function (req, res) {
  res.render("about");
});

// root page POST route
app.post("/", function (req, res) {
  const listTitle = req.body.list;      // POST request list type (either todo or work)
  const listItem = req.body.todoItem;   // POST todo/work item data

  // Checking which list POST request came from
  if (listTitle === "Work List") {

    // Create new document to store new item under WorkItems collection (Database)
    const newItem = new WorkItem({
      name: listItem
    });
    
    // Store document (Database)
    newItem.save();
    res.redirect("/work");
  } else if (listTitle === day) {

    // Create new document to store new item under Items collection (Database)
    const newItem = new Item({
      name: listItem
    });

    // Store document (Database)
    newItem.save();
    res.redirect("/");
  } else {

    // Create new document of type ItemSchema (Database)
    const item = new Item({
      name: listItem
    })

    // Search Lists collection in db for specified todo list name (Database)
    List.findOne({ name: listTitle }, function (err, foundList) {

      if (err) {
        console.log(err);
        
      } else {
      
        // Add the new item to the found Lists item document
        foundList.items.push(item);

        // Save the updated document
        foundList.save();
        res.redirect(`/${listTitle}`);
      }
    });
  }
});

// delete route POST method
app.post("/delete", function(req, res) {
  const listName = req.body.listName;    // Value indicating database collection type
  const item = req.body.itemToDelete;     // Item to delete from database    

  if (listName === day) {

    // Delete selected document in Items collection (Database)
    Item.findByIdAndRemove(item, function (err) {
      if (err) {
        console.log(err);
      } else {
        console.log("Deleted document from Items collection");
        
        res.redirect("/");
      }
    });
  } else if (listName === "Work List") {

    // Delete selected document in WorkItems collection (Database)
    WorkItem.findByIdAndRemove(item, function (err) {
      if (err) {
        console.log(err);
      } else {
        console.log("Deleted document from WorkItems collection");

        res.redirect("/work");
      }
    });
  } else {

    // Delete selected item in array from document in List collection (Database)
    List.findOneAndUpdate(
      { name: listName }, 
      { $pull : { items: { _id: item } } }, 
      function (err, foundList) {
        if (err) {
          console.log(err);
        } else {
          console.log("Deleted array item from list collection");

          res.redirect("/" + listName);
        }
    });
  }
});

// work page POST route
app.post("/work", function (req, res) {
  res.redirect("/work");
});

app.listen(PORT, function () {
  console.log(`Listening on http://localhost:${PORT}`);
});
