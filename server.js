import express from "express"

const app = express()
const port = process.env.PORT || 8000

app.get('/', (req, res) => {
  res.status(200).send({
    timestamp: new Date().toString()
  })
})

app.use('*splat', (req, res, next) => {
  res.status(404).send({
    err: `Path ${req.originalUrl} does not exist`
  })
})

app.listen(port, () => {
  console.log("== Server is running on port", port)
})
