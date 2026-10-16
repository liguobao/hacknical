import koaRouter from 'koa-router'

const router = new koaRouter({ prefix: '/legal' })

router.get('/privacy', async ctx => {
  await ctx.render('legal/privacy', { title: '隐私政策 | Hackneo' })
})

router.get('/terms', async ctx => {
  await ctx.render('legal/terms', { title: '服务条款 | Hackneo' })
})

module.exports = router
