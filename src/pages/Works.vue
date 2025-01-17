<template>
  <div>
    <RecentList />

    <div class="text-h5 text-weight-regular q-ma-md">
      {{ pageTitle }}
      <span v-show="pagination.totalCount">
        ({{ pagination.totalCount }})
      </span>
    </div>

    <div :class="`row justify-center ${displayMode === 'list' ? 'list' : 'q-mx-md'}`">
      <!-- <q-infinite-scroll @load="onLoad" :offset="250" :disable="stopLoad" class="col"> -->
        <q-page class="col">
        <!-- 有作品显示时，显示排序和浏览模式选项 -->
        <div v-show="works.length" class="row justify-between q-mb-md q-mr-sm">
          <!-- 排序选择框 -->
          <q-select
            dense
            rounded
            outlined
            :bg-color="color"
            transition-show="scale"
            transition-hide="scale"
            v-model="sortOption"
            :options="options"
            label="排序"
            class="col-auto"
          />

          <q-checkbox v-model="subtitleOnly" label="带字幕" class="row" @input="subtitleFilter()"></q-checkbox>

          <!-- 切换显示模式按钮 -->
          <q-btn-toggle
            dense
            spread
            rounded
            v-model="displayMode"
            toggle-color="primary"
            color="white"
            text-color="primary"
            :options="[
              { icon: 'view_module', value: 'thumbnail' },
              { icon: 'view_column', value: 'detail'},
              { icon: 'list', value: 'list' }
            ]"
            style="width: 85px;"
            class="col-auto"
          />
        </div>

        <!-- 无缩略图的列表 -->
        <q-list v-if="displayMode === 'list'" bordered separator class="shadow-2">
          <WorkListItem v-for="work in works" :key="work.id" :metadata="work" :showLabel=true />
        </q-list>

        <!-- 缩略图或完整卡片 -->
        <div v-else class="row q-col-gutter-x-md q-col-gutter-y-lg">
          <div class="col-xs-12 col-sm-6 col-md-4" :class="displayMode === 'detail' ? 'col-lg-3 col-xl-3': 'col-lg-2 col-xl-2'" v-for="work in works" :key="work.id">
            <WorkCard :metadata="work" :thumbnailMode="displayMode === 'thumbnail'" class="fit"/>
          </div>
        </div>

        <!-- 无更多作品时 stopLoad = true-->
        <div v-show="stopLoad && maxPage === 0" class="q-mt-lg q-mb-xl text-h6 text-bold text-center">END</div>

        <!-- loading -->
        <div class="row justify-center q-my-md" v-show="loading">
          <q-spinner-dots color="primary" size="40px"/>
        </div>

        <!-- 分页 -->
        <div class="q-py-lg flex flex-center">
          <Pagination
            show-quick-jumper
            :class="this.$q.dark.isActive ? 'dark' : ''"
            v-model="page"
            :pageSize="pagination.pageSize"
            :total="pagination.totalCount"
            :itemRender="paginationItemRender"
          />
        </div>
      <!-- </q-infinite-scroll> -->
      </q-page>
    </div>
  </div>
</template>

<script>
import WorkCard from 'components/WorkCard'
import WorkListItem from 'components/WorkListItem'
import NotifyMixin from '../mixins/Notification.js'
import RecentList from 'components/RecentList'
import {EventBus} from '../utils/EventBus.js'
import DarkMode from '../mixins/DarkMode'
import {Pagination} from 'ant-design-vue';
import 'ant-design-vue/lib/pagination/style/css';
import {debounce} from 'quasar';
import {isPrerender} from "src/utils/prerender";

export default {
  name: 'Works',

  mixins: [NotifyMixin,DarkMode],

  components: {
    WorkCard,
    WorkListItem,
    RecentList,
    Pagination
  },

  data () {
    return {
      lastUrlBeforeDeactivate: '',
      lastPageBeforeDeactivate : 1,
      active: false,
      displayMode: isPrerender() ? 'thumbnail' : 'detail',
      showLabel: true,
      detailMode: true,
      stopLoad: false,
      loading: true,
      works: [],
      pageTitle: '',
      //page: 1,
      pagination: { currentPage:0, pageSize:12, totalCount:0 },
      seed: 7, // random sort
      subtitleOnly: false,
      previousUrl: '',
      sortOption: {
        label: '最新收錄',
        order: 'insert_time',
        sort: 'desc'
      },
      options: [
        {
          label: '最新收錄',
          order: 'insert_time',
          sort: 'desc'
        },
        {
          label: '發售日新到舊',
          order: 'release',
          sort: 'desc'
        },
        {
          label: '發售日舊到新',
          order: 'release',
          sort: 'asc'
        },
        {
          label: 'RJ號大到小',
          order: 'id',
          sort: 'desc'
        },
        {
          label: 'RJ號小到大',
          order: 'id',
          sort: 'asc'
        },
        {
          label: '價格貴到便宜',
          order: 'price',
          sort: 'desc'
        },
        {
          label: '價格便宜到貴',
          order: 'price',
          sort: 'asc'
        },
        {
          label: '評價高到低',
          order: 'rate_average_2dp',
          sort: 'desc'
        },
        {
          label: '評論多到少',
          order: 'review_count',
          sort: 'desc'
        },
        {
          label: '售出數多到少',
          order: 'dl_count',
          sort: 'desc'
        },
        {
          label: '我的評價排序',
          order: 'rating',
          sort: 'desc'
        },
        {
          label: '全年齡新作優先',
          order: 'nsfw',
          sort: 'asc'
        },
        {
          label: '隨機排序',
          order: 'random',
          sort: 'desc'
        }
      ]
    }
  },

  created () {
    this.refreshPageTitle();
    this.seed = Math.floor(Math.random() * 100);
    this.reset = debounce(this.reset, 300)
  },

  mounted() {
    if (localStorage.sortOption) {
      try {
        this.sortOption = JSON.parse(localStorage.sortOption);
      } catch {
        localStorage.removeItem('sortOption');
      }
    }
    if (localStorage.subtitleOnly) {
      this.subtitleOnly = (localStorage.subtitleOnly === 'true');
    }
    if (localStorage.displayMode) {
      this.displayMode = localStorage.displayMode;
    }
    EventBus.$on("setProgress", (id, newProgress) => {
      for (let i in this.works){
        if(id === this.works[i].id){
          this.works[i].userProgress = newProgress;
          break;
        }
      }
    })
    this.requestWorksQueue()
    this.skipNextReset = true;
    this.lastPageBeforeDeactivate = this.page;
  },

  beforeDestroy() {
    EventBus.$off("setProgress")
  },

  computed: {
    maxPage() {
      return Math.ceil(this.pagination.totalCount / this.pagination.pageSize);
    },

    page: {
      set(page) {
        this.lastPageBeforeDeactivate = page;
        this.$router.push({
          name: this.$route.name,
          query: { ...this.$route.query, page: page }
        })
      },

      get() {
        // 如果在列表界面，直接返回当前 page
        // 脱离列表界面（例如进入作品详情）时，返回最后一次获取到的 page
        return parseInt(this.$route.query.page) || (this.active ? 1 : this.lastPageBeforeDeactivate);
      }
    },

    url () {
      const query = this.$route.query
      if (query.circleId) {
        return `/api/circles/${this.$route.query.circleId}/works`
      } else if (query.tagId) {
        return `/api/tags/${this.$route.query.tagId}/works`
      } else if (query.vaId) {
        return `/api/vas/${this.$route.query.vaId}/works`
      } else if (query.keyword) {
        return `/api/search/${query.keyword}`
      } else if (query.seriesId) {
        return `/api/series/${this.$route.query.seriesId}/works`
      } else {
        return '/api/works'
      }
    }
  },

  // keep-alive hooks
  // <keep-alive /> is set in MainLayout
  activated () {
    this.stopLoad = false
    // 用户从作品详情页返回时，有此处判定是否需要刷新api
    // 当用户返回时的 url 与离开时的 url 不同，
    // 证明用户在作品详情页点击了某些跳转（tag，group etc.)，需要刷新作品列表
    if (this.lastUrlBeforeDeactivate !== this.url) {
      this.lastUrlBeforeDeactivate = this.url
      this.reset()
    }
    // 进入 works 页面后，判定移交给 watch.url
    this.active = true
  },

  deactivated () {
    this.stopLoad = true
    // 注销 watch.url 的判定权限
    this.active = false
  },

  watch: {
    url () {
      // 当用户一直在 works 界面时，api url 的变动由此处处理
      if (this.active) {
        this.lastUrlBeforeDeactivate = this.url;
        this.reset()
      }
    },

    sortOption (newSortOptionSetting) {
      localStorage.sortOption = JSON.stringify(newSortOptionSetting);
      this.seed = Math.floor(Math.random() * 100);
      this.reset();
    },

    subtitleOnly (newSubtitleOnly) {
      localStorage.subtitleOnly = newSubtitleOnly;
    },

    showLabel (newLabelSetting) {
      localStorage.showLabel = newLabelSetting;
    },

    listMode (newListModeSetting) {
      localStorage.listMode = newListModeSetting;
    },

    detailMode(newModeSetting) {
      localStorage.detailMode = newModeSetting;
    },

    page() {
      // TODO 回到顶部怎么才能更优雅一点？
      document.getElementById("gotop") ? document.getElementById("gotop").click() : false;
      this.requestWorksQueue();
    },
  },

  methods: {
    paginationItemRender(current, type, originalElement) {
      // prerender 不支持 script，所以回落到 href 跳转
      if (isPrerender()) {
        const url = this.$router.resolve({
          name: 'works',
          query: { ...this.$route.query, page: current },
        }).href
        originalElement.data = originalElement.data || {};
        originalElement.data.attrs = originalElement.data.attrs || {}
        originalElement.data.attrs.href = url
      }
      return originalElement;
    },

    requestWorksQueue () {
      this.loading = true;
      this.works = {};
      const params = {
        order: this.sortOption.order,
        sort: this.sortOption.sort,
        // page: this.pagination.currentPage + 1 || 1,
        page: this.page,
        seed: this.seed,
        subtitle: this.subtitleOnly ? 1 : 0
      }

      // 若有老请求，取消之
      if (this.requestDataCancelTokenSource) {
        this.requestDataCancelTokenSource.cancel("new request replace old request")
      }

      // 创建新的 cancel token
      this.requestDataCancelTokenSource = this.$axios.CancelToken.source()
      const afterRequestCleanUp = () => {
        this.requestDataCancelTokenSource = null
      }

      return this.$axios.get(this.url, {params, cancelToken: this.requestDataCancelTokenSource.token})
        .then((response) => {
          this.loading = false;
          const works = response.data.works
          // this.works = (params.page === 1) ? works.concat() : this.works.concat(works)
          this.works = works.concat();
          this.pagination = response.data.pagination

          if (this.works.length >= this.pagination.totalCount) {
            this.stopLoad = true
          }
        })
        .catch((error) => {
          // 若是因为新请求取消了老请求，不报错
          if (this.$axios.isCancel(error)) {
            console.log('Request canceled', error.message)
            return
          }
          this.loading = false;
          if (error.response) {
            // 请求已发出，但服务器响应的状态码不在 2xx 范围内
            if (error.response.status !== 401) {
              this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
            }
          } else {
            this.showErrNotif(error.message || error)
          }
          this.stopLoad = true
        })
        .finally(afterRequestCleanUp)
    },

    refreshPageTitle () {
      if (this.$route.query.circleId || this.$route.query.tagId || this.$route.query.vaId || this.$route.query.seriesId) {
        let url = '', restrict = ''
        if (this.$route.query.circleId) {
          restrict = 'circles'
          url = `/api/${restrict}/${this.$route.query.circleId}`
        } else if (this.$route.query.tagId) {
          restrict = 'tags'
          url = `/api/${restrict}/${this.$route.query.tagId}`
        } else if (this.$route.query.vaId){
          restrict = 'vas'
          url = `/api/${restrict}/${this.$route.query.vaId}`
        } else {
          restrict = 'series'
          url = `/api/${restrict}/${this.$route.query.seriesId}`
        }

        this.$axios.get(url)
          .then((response) => {
            const name = response.data.name
            let pageTitle

            switch (restrict) {
              case 'tags':
                pageTitle = 'Works tagged with '
                break
              case 'vas':
                pageTitle = 'Works voiced by '
                break
              case 'circles':
                pageTitle = 'Works by '
                break
              case 'series':
                pageTitle = 'Works in '
                break
            }
            pageTitle += name || ''

            this.pageTitle = pageTitle
          })
          .catch((error) => {
            if (error.response) {
              // 请求已发出，但服务器响应的状态码不在 2xx 范围内
              if (error.response.status !== 401) {
                this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
              }
            } else {
              this.showErrNotif(error.message || error)
            }
          })
      } else if (this.$route.query.keyword) {
        this.pageTitle = `Search by ${this.$route.query.keyword}`
      } else {
        this.pageTitle = 'All works'
      }
    },

    reset() {
      if (this.skipNextReset) {
        this.skipNextReset = false;
        return
      }
      // 当用户浏览完全不同的 works 时会触发本方法
      // 比如：不同标签，社团...
      // 不包含：翻页，keep-alive 返回，
      this.stopLoad = false
      this.refreshPageTitle()
      this.pagination = {currentPage: 0, pageSize: 12, totalCount: 0}
      // TODO 此处逻辑需要通过重写 query 规则进行优化
      if (this.page === 1) {
        // 当 page === 1 时，由本方法调用 requestWorksQueue
        this.requestWorksQueue()
      } else {
        // 否则通过设定 page = 1，触发 this.page 的 watcher，间接调用 requestWorksQueue
        this.page = 1
      }
    },

    subtitleFilter () {
        if (this.subtitleOnly) {
            window.location.href = '/works?tagId=-1'
        }
        else{
            window.location.href = '/works'
        }
    },
  }
}
</script>

<style lang="scss">
.list {
  // 宽度 >= $breakpoint-sm-min
  @media (min-width: $breakpoint-sm-min) {
    padding: 0px 20px;
  }
}
.work-card {
  // 宽度 > $breakpoint-xl-min
  @media (min-width: $breakpoint-md-min) {
    width: 560px;
  }
}
.dark .ant-pagination-item-link,
.dark .ant-pagination-options-quick-jumper {
  color: #fff !important;
  background-color: transparent !important;
  border: none !important;
}
.dark .ant-pagination-item {
  //border: none !important;
  background-color: transparent !important;
}
.dark .ant-pagination-item a {
  color: #fff !important;
}
.dark .ant-pagination-item-ellipsis {
  color: #fff !important;
}
.dark .ant-pagination-options-quick-jumper input {
  background-color: transparent !important;
  color: white;
}
.ant-pagination-item ,
.ant-pagination-jump-next,
.ant-pagination-jump-prev,
.ant-pagination-next,
.ant-pagination-prev {
  @media (max-width: $breakpoint-xs-max) {
    // compact mode
    margin-top: 4px;
    margin-right: 4px;
    margin-bottom: 4px;
    //height: 28px;
    //line-height: 28px;
    //min-width: 28px;
    //border: none !important;
  }
}
body {
  // side effect of antd
  color: black !important;
}
body.body--dark {
  // side effect of antd
  color: #fff !important;
}
.ant-pagination-options {
  @media (max-width: 576px) {
    display: block !important;
    text-align: center !important;
    margin-top: 2px !important;
  }
}
</style>
