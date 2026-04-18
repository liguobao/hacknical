const DEMO_LOGIN = 'demo'
const DEMO_USER_ID = 'demo-user-id'

const demoUser = {
  userId: DEMO_USER_ID,
  login: DEMO_LOGIN,
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
    name: 'Demo',
    gender: 'male',
    phone: '13800000000',
    email: 'demo@hacknical.com',
    intention: 'Frontend Engineer',
    location: 'Beijing',
    avator: demoUser.githubAvator,
    freshGraduate: false,
    freshGraduateYear: 2020,
    birthday: '1990-01-01',
    startWorkingYear: 2020
  },
  workExperiences: [],
  educations: [],
  personalProjects: [],
  others: { dream: 'Hacking on side projects.' },
  educationList: [],
  workList: [],
  projectList: []
}

const demoResumeInfo = {
  userId: DEMO_USER_ID,
  login: DEMO_LOGIN,
  openShare: true,
  simplifyUrl: DEMO_LOGIN,
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
    exact('/resume', { resume: demoResumeContent, info: demoResumeInfo }),
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
