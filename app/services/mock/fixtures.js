const DEMO_LOGIN = 'demo'
const DEMO_USER_ID = 'demo-user-id'

const demoUser = {
  userId: DEMO_USER_ID,
  login: DEMO_LOGIN,
  userName: 'Demo User',
  githubLogin: DEMO_LOGIN,
  githubId: 1,
  githubAvator: 'https://avatars.githubusercontent.com/u/1?v=4',
  githubShare: true,
  initialed: true,
  disabled: false,
  openShare: true,
  resumeShare: true,
  freshUser: false,
  admin: true,
  locale: 'zh',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: new Date().toISOString()
}

const demoGithubUser = {
  login: DEMO_LOGIN,
  id: 1,
  name: 'Demo User',
  avatar_url: demoUser.githubAvator,
  html_url: `https://github.com/${DEMO_LOGIN}`,
  bio: 'Hacknical demo account',
  company: 'Hacknical',
  blog: 'https://hacknical.com',
  email: 'demo@hacknical.com',
  location: 'Beijing',
  hireable: true,
  public_repos: 3,
  public_gists: 0,
  followers: 42,
  following: 7,
  created_at: '2020-01-01T00:00:00Z',
  updated_at: new Date().toISOString()
}

const makeRepo = (name, language, stars, forks) => ({
  name,
  full_name: `${DEMO_LOGIN}/${name}`,
  owner: { login: DEMO_LOGIN },
  html_url: `https://github.com/${DEMO_LOGIN}/${name}`,
  description: `${name} is a demo repository`,
  fork: false,
  language,
  stargazers_count: stars,
  forks_count: forks,
  watchers_count: stars,
  size: 1024,
  open_issues_count: 0,
  pushed_at: '2025-01-01T00:00:00Z',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  topics: [language.toLowerCase()]
})

const demoRepos = [
  makeRepo('hacknical-web', 'JavaScript', 128, 22),
  makeRepo('hacknical-server', 'TypeScript', 96, 14),
  makeRepo('light-ui', 'JavaScript', 58, 6)
]

const makeCommits = (weeks) => weeks.map(week => ({
  week,
  total: 7,
  days: [1, 2, 0, 1, 1, 2, 0]
}))

const demoCommits = [
  {
    name: 'hacknical-web',
    language: 'JavaScript',
    totalCommits: 420,
    created_at: '2024-01-01T00:00:00Z',
    commits: makeCommits([1704067200, 1704672000, 1705276800, 1705881600])
  },
  {
    name: 'hacknical-server',
    language: 'TypeScript',
    totalCommits: 210,
    created_at: '2024-06-01T00:00:00Z',
    commits: makeCommits([1704067200, 1704672000, 1705276800])
  },
  {
    name: 'light-ui',
    language: 'JavaScript',
    totalCommits: 96,
    created_at: '2024-03-01T00:00:00Z',
    commits: makeCommits([1704672000, 1705276800])
  }
]

const demoLanguages = {
  JavaScript: 42000,
  TypeScript: 21000,
  CSS: 8000,
  HTML: 5000
}

const demoHotmap = {
  datas: [],
  start: '2024-01-01',
  end: '2025-01-01',
  streak: 5,
  total: 365,
  max: 8,
  longestStreak: 24
}

const demoOrgs = []

const demoResumeContent = {
  info: {
    name: 'Demo User',
    gender: 'male',
    phone: '13800000000',
    email: 'demo@hacknical.com',
    intention: 'Frontend Engineer',
    location: 'Beijing',
    avator: demoUser.githubAvator,
    hireAvailable: true,
    privacyProtect: false,
    freshGraduate: false,
    freshGraduateYear: 2020,
    birthday: '1990-01-01',
    startWorkingYear: 2020,
    languages: ['JavaScript', 'TypeScript', 'Go']
  },
  workExperiences: [
    {
      company: 'Hacknical',
      url: 'https://hacknical.com',
      startTime: '2022-03',
      endTime: '',
      position: 'Senior Frontend Engineer',
      projects: [
        {
          name: 'Hacknical Web',
          url: 'https://hacknical.com',
          details: [
            '负责 Hacknical 简历与 GitHub 数据展示页面的整体前端架构设计与演进。',
            '基于 React + Redux 搭建组件体系，沉淀 light-ui 组件库，提升团队研发效率。',
            '推动前端构建工具从 webpack 4 升级到 webpack 5，构建耗时下降约 40%。'
          ]
        },
        {
          name: 'Resume Builder',
          url: '',
          details: [
            '设计并实现所见即所得的在线简历编辑器，支持自定义模块、一键分享、PDF 导出。',
            '引入单元测试和 E2E 测试体系，核心模块覆盖率 > 85%。'
          ]
        }
      ]
    },
    {
      company: 'Example Tech',
      url: 'https://example.com',
      startTime: '2020-07',
      endTime: '2022-02',
      position: 'Frontend Engineer',
      projects: [
        {
          name: 'Growth Platform',
          url: '',
          details: [
            '参与公司增长平台的前端研发，基于 React + TypeScript 构建数据可视化大盘。',
            '独立完成 A/B 实验投放 SDK，日均 PV 超过 200w。'
          ]
        }
      ]
    }
  ],
  educations: [
    {
      school: '清华大学',
      major: '计算机科学与技术',
      education: '本科',
      startTime: '2016-09',
      endTime: '2020-06',
      experiences: [
        '曾担任校 ACM 集训队队长，带队获得区域赛银牌。',
        '主修方向为软件工程与分布式系统，GPA 3.8 / 4.0。'
      ]
    }
  ],
  personalProjects: [
    {
      url: 'https://github.com/demo/hacknical-web',
      desc: '开源的 GitHub 数据可视化与在线简历平台，支持多语言、多模板、一键分享。',
      title: 'hacknical-web',
      techs: ['React', 'Redux', 'Koa', 'MongoDB']
    },
    {
      url: 'https://github.com/demo/light-ui',
      desc: '轻量的 React 组件库，覆盖表单、弹窗、导航等常用交互场景。',
      title: 'light-ui',
      techs: ['React', 'Sass', 'Rollup']
    },
    {
      url: 'https://github.com/demo/hacknical-server',
      desc: 'Hacknical 后端服务，基于 Koa 3 + MongoDB，聚合 GitHub 开放 API 数据。',
      title: 'hacknical-server',
      techs: ['Koa', 'TypeScript', 'MongoDB', 'Redis']
    }
  ],
  others: {
    expectLocation: '北京',
    expectLocations: ['北京', '上海', '远程'],
    expectSalary: '面议',
    dream: '持续打磨有趣的产品，把工程体验做到极致。',
    supplements: [
      '活跃的开源贡献者，关注前端基础设施与可视化方向。',
      '喜欢写技术博客，分享工程实践与学习笔记。'
    ],
    socialLinks: [
      {
        name: 'github',
        text: 'GitHub',
        icon: 'github.png',
        url: `https://github.com/${DEMO_LOGIN}`
      },
      {
        name: 'blog',
        text: '个人博客',
        icon: 'blog.png',
        url: 'https://hacknical.com'
      }
    ]
  },
  educationList: [],
  workList: [],
  projectList: []
}

const demoResumeInfo = {
  userId: DEMO_USER_ID,
  login: DEMO_LOGIN,
  openShare: true,
  simplifyUrl: DEMO_LOGIN,
  resumeHash: 'demo-hash',
  template: 'v1',
  githubSections: [
    { id: 'hotmap', enabled: true },
    { id: 'info', enabled: true },
    { id: 'repos', enabled: true },
    { id: 'course', enabled: true },
    { id: 'languages', enabled: true },
    { id: 'orgs', enabled: true },
    { id: 'contributed', enabled: true },
    { id: 'commits', enabled: true }
  ],
  useGithub: true,
  url: DEMO_LOGIN,
  viewTimes: 12,
  downloadTimes: 3
}

const demoUpdateStatus = {
  status: 1,
  startUpdateAt: '2025-01-01T00:00:00Z',
  lastUpdateTime: new Date().toISOString()
}

const exact = (path, data, method = 'get') => ({ match: path, data, method })
const regex = (re, data, method = 'get') => ({ match: re, data, method })

const fixtures = {
  user: [
    exact('/user', demoUser),
    exact('/user', { success: true }, 'put'),
    exact('/user', { success: true, userId: DEMO_USER_ID }, 'post'),
    exact('/user/count', 1024),
    exact('/resume', {
      resume: demoResumeContent,
      info: demoResumeInfo,
      languages: ['JavaScript', 'TypeScript', 'Go'],
      updated_at: new Date().toISOString()
    }),
    exact('/resume', { success: true }, 'put'),
    exact('/resume/information', demoResumeInfo),
    exact('/resume/information', { success: true }, 'put'),
    exact('/resume/count', 256)
  ],
  github: [
    regex(/^\/github\/[^/]+\/repositories$/, demoRepos),
    regex(/^\/github\/[^/]+\/contributed$/, []),
    regex(/^\/github\/[^/]+\/commits$/, demoCommits),
    regex(/^\/github\/[^/]+\/languages$/, demoLanguages),
    regex(/^\/github\/[^/]+\/organizations$/, demoOrgs),
    regex(/^\/github\/[^/]+\/hotmap$/, demoHotmap),
    regex(/^\/github\/[^/]+\/update$/, demoUpdateStatus),
    regex(/^\/github\/[^/]+\/update$/, { success: true }, 'put'),
    regex(/^\/github\/[^/]+$/, { success: true }, 'patch'),
    regex(/^\/scientific\/[^/]+\/statistic$/, { total: 0 }),
    regex(/^\/scientific\/[^/]+\/predictions$/, []),
    regex(/^\/scientific\/[^/]+\/predictions$/, { success: true }, 'delete'),
    regex(/^\/scientific\/[^/]+\/predictions$/, { success: true }, 'put'),
    exact('/github/zen', 'Design for failure.'),
    exact('/github/octocat', 'MU. MU. MU.'),
    exact('/github/verify', { ok: true }),
    exact('/github/token', { access_token: 'demo-token' }),
    exact('/github/login', { login: DEMO_LOGIN }),
    regex(/^\/github\/[^/]+$/, demoGithubUser)
  ],
  stat: [
    exact('/notify/all', []),
    regex(/^\/notify\/[^/]+$/, []),
    regex(/^\/notify\/[^/]+$/, { success: true }, 'put'),
    regex(/^\/notify\/[^/]+$/, { success: true }, 'patch'),
    exact('/stat', { total: 0 }),
    exact('/stat', { success: true }, 'put'),
    exact('/logs', []),
    exact('/logs', { success: true }, 'put'),
    exact('/records', []),
    exact('/records/all', []),
    exact('/records', { success: true }, 'put')
  ],
  besticon: [],
  ip: [],
  auth0: []
}

export default fixtures
