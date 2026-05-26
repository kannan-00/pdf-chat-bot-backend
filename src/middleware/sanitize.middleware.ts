import { Request, Response, NextFunction } from "express"

const clean = (obj: any): any => {
  if (obj instanceof Object) {
    for (const key in obj) {
      if (key.startsWith("$")) {
        delete obj[key]
      } else {
        clean(obj[key])
      }
    }
  }
  return obj
}

export const mongoSanitize = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) clean(req.body)
  if (req.params) clean(req.params)
  if (req.query) clean(req.query)
  next()
}
