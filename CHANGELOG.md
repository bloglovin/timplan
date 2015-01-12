## 1.1.0 (2015-01-12)


#### Features

* **coercion:** enable coercion for payload and response ([8dab49e0](https://github.com/bloglovin/timplan/commit/8dab49e0dc4554ecb1e2da61ad7974453e4c7c9d))


## 1.0.0 (2014-11-05)


#### Features

* **main:** remove severity setting ([70d9057b](https://github.com/bloglovin/timplan/commit/70d9057baa0d545e79f853dd0bbfc897647219ba))


#### Breaking Changes

* there is no longer a severity option in timplan itself. This will make response validation failures return a 500-error. Use the built in hapi route configuration `route.config.response.failAction = 'log’` instead.
 ([70d9057b](https://github.com/bloglovin/timplan/commit/70d9057baa0d545e79f853dd0bbfc897647219ba))


### 0.5.3 (2014-10-23)


#### Bug Fixes

* **dependencies:** allow hapi 7.x ([65b9be6e](https://github.com/bloglovin/timplan/commit/65b9be6e281792edd3b369c656757f0580746958))
* **main:** Handle validator exceptions ([b22baf79](https://github.com/bloglovin/timplan/commit/b22baf79599ed22094457a45cd92014f911e9245))


### 0.5.2 (2014-10-20)


#### Bug Fixes

* **plugin:** properly register hapi plugin metadata ([a22a12e2](https://github.com/bloglovin/timplan/commit/a22a12e26ab513f979170f22250fc7b0a61210c2))
