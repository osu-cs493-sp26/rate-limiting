import express from "express"
import dotenv from "dotenv"
import { createClient } from "redis"

dotenv.config({ path: ".env.local" })

const redisClient = createClient({
  url: process.env.REDIS_URL
})

async function rateLimit(req, res, next) {
  const rateLimitWindowMs = 60000
  const rateLimitMaxRequests = 5
  let tokenBucket
  try {
    tokenBucket = await redisClient.hGetAll(req.ip)
  } catch (err) {
    console.err(err)
    next()
    return
  }
  tokenBucket = {
    tokens: parseFloat(tokenBucket.tokens) || rateLimitMaxRequests,
    last: parseInt(tokenBucket.last) || Date.now()
  }

  const timestamp = Date.now()
  const ellapsedMs = timestamp - tokenBucket.last
  tokenBucket.tokens += (rateLimitMaxRequests / rateLimitWindowMs) * ellapsedMs
  tokenBucket.tokens = Math.min(tokenBucket.tokens, rateLimitMaxRequests)
  tokenBucket.last = timestamp

  if (tokenBucket.tokens >= 1) {
    tokenBucket.tokens -= 1
    await redisClient.hSet(req.ip, [
      [ "tokens", tokenBucket.tokens ],
      [ "last", tokenBucket.last ]
    ])
    next()
  } else {
    await redisClient.hSet(req.ip, [
      [ "tokens", tokenBucket.tokens ],
      [ "last", tokenBucket.last ]
    ])
    res.status(429).send({
      err: "Too many requests"
    })
  }
}

const app = express()
const port = process.env.PORT || 8000

app.use(rateLimit)

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

await redisClient.connect()
app.listen(port, () => {
  console.log("== Server is running on port", port)
})
