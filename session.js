class MongoSession {
	constructor (options) {
		this.options = Object.assign({
			property: 'session',
			getSessionKey: (ctx) => ctx.from && ctx.chat && `${ctx.from.id}:${ctx.chat.id}`,
			store: {},
		}, options)

		this.module = this.options.store;
	}

	getSession (key) {
		return new Promise((resolve, reject) => {
			this.module.findOne({key: key}, (err, res) => {
				if (err) {
					return reject(err)
				}
				if (res) {
					try {
						const session = JSON.parse(res.value)
						debug('session state', key, session)
						resolve(session)
					} catch (error) {
						debug('Parse session state failed', error)
					}
				}
				resolve({})
			})
		})
	}

	clearSession (key) {
		debug('clear session', key)
		return new Promise((resolve, reject) => {
			this.module.deleteOne({key: key}, err => {
				if (err) {
					return reject(err)
				}
				resolve()
			})
		})
	}

	saveSession (key, session) {
		if (!session || Object.keys(session).length === 0) {
		return this.clearSession(key)
		}
		debug('save session', key, session)
		return new Promise((resolve, reject) => {
			this.module.updateOne({key: key}, {$set: {value: JSON.stringify(session)}}, {upsert: true}, err => {
				if (err) {
					return reject(err)
				}
				resolve({})
			})
		})
	}

	middleware () {
		return (ctx, next) => {
		const key = this.options.getSessionKey(ctx)
		if (!key) {
			return next()
		}
		return this.getSession(key).then((session) => {
			debug('session snapshot', key, session)
			Object.defineProperty(ctx, this.options.property, {
			get: function () { return session },
			set: function (newValue) { session = Object.assign({}, newValue) }
			})
			return next().then(() => this.saveSession(key, session))
		})
		}
	}
}

module.exports = MongoSession
