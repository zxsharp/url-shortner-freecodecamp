require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);
const { promisify } = require('node:util');
const dns = require('node:dns');


// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});


async function connectToDb() {
  try{
    await mongoose.connect(process.env.MONGO_URI);
    console.log('connected to db');
  }
  catch(err){
      console.log('error connecting to db');
  }
}
connectToDb();

const UrlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number
})
UrlSchema.plugin(AutoIncrement, { inc_field: 'short_url' });
const Url = mongoose.model("Url", UrlSchema);

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

// POST
app.post('/api/shorturl', async (req, res) => {

  const url = req.body.url;

  // url check (http/https)
  if (!url || !(url.startsWith("http://") || url.startsWith("https://"))) {
    return res.json({ error: "invalid url" });
  }

  // url dns lookup
  let hostname;
  try {
    const urlObj = new URL(url);
    hostname = urlObj.hostname;
  } catch (err) {
    return res.json({ error: "invalid url" });
  } 

  const promisifiedDnsLookup = promisify(dns.lookup);
  try{
    await promisifiedDnsLookup(hostname)
  }
  catch(err){
    res.json({
      error: 'invalid url'
    })
    return;
  }
  
  // shorturl autoincrement and store in db
  const response = await Url.create({
    original_url: url
  })

  res.json(response);
  return;
  
})

// GET
app.get('/api/shorturl/:id', async (req, res) => {
  // db call with :id, redirect to original_url
  const short_url = req.params.id
  const response = await Url.findOne({short_url})

  if(!response){
    res.json({
      error: "invalid url"
    })
    return;
  }

  res.redirect(response.original_url);
  
})

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
