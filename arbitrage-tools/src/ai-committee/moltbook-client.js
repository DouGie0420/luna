// Moltbook客户端模块
const axios = require('axios');

class MoltbookClient {
  constructor(config) {
    this.config = config;
    this.apiKey = config.api_key;
    this.baseURL = 'https://www.moltbook.com/api/v1';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 15000,
      headers: {
        'Authorization': Bearer ,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(" Moltbook客户端初始化\);
 }
 
 // 创建帖子
 async createPost(postData) {
 try {
 const response = await this.client.post('/posts', postData);
 
 if (response.data.success) {
 console.log(\Moltbook帖子创建成功: ...\);
 return {
 success: true,
 postId: response.data.post?.id,
 message: response.data.message
 };
 } else {
 console.error('Moltbook帖子创建失败:', response.data.error);
 return {
 success: false,
 error: response.data.error
 };
 }
 } catch (error) {
 console.error('Moltbook API错误:', error.message);
 return {
 success: false,
 error: error.message
 };
 }
 }
 
 // 获取首页信息
 async getHome() {
 try {
 const response = await this.client.get('/home');
 return response.data;
 } catch (error) {
 console.error('获取Moltbook首页失败:', error.message);
 return null;
 }
 }
 
 // 获取热门帖子
 async getHotPosts(limit = 10) {
 try {
 const response = await this.client.get('/posts', {
 params: {
 sort: 'hot',
 limit: limit
 }
 });
 return response.data;
 } catch (error) {
 console.error('获取Moltbook热门帖子失败:', error.message);
 return null;
 }
 }
 
 // 搜索帖子
 async searchPosts(query, limit = 5) {
 try {
 const response = await this.client.get('/search', {
 params: {
 q: query,
 limit: limit
 }
 });
 return response.data;
 } catch (error) {
 console.error('Moltbook搜索失败:', error.message);
 return null;
 }
 }
 
 // 创建评论
 async createComment(postId, content) {
 try {
 const response = await this.client.post(\/posts//comments\, {
 content: content
 });
 
 if (response.data.success) {
 console.log(\评论创建成功: ...\);
 return { success: true, commentId: response.data.comment?.id };
 } else {
 return { success: false, error: response.data.error };
 }
 } catch (error) {
 console.error('创建评论失败:', error.message);
 return { success: false, error: error.message };
 }
 }
 
 // 点赞帖子
 async upvotePost(postId) {
 try {
 const response = await this.client.post(\/posts//upvote\);
 return { success: response.data.success };
 } catch (error) {
 console.error('点赞失败:', error.message);
 return { success: false, error: error.message };
 }
 }
 
 // 测试连接
 async testConnection() {
 try {
 const response = await this.client.get('/agents/me');
 
 if (response.data.success) {
 return {
 success: true,
 agent: response.data.agent,
 message: 'Moltbook连接成功'
 };
 } else {
 return {
 success: false,
 error: response.data.error
 };
 }
 } catch (error) {
 return {
 success: false,
 error: error.message
 };
 }
 }
}

module.exports = MoltbookClient;
