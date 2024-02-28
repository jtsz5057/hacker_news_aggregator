import axios from 'axios';
import "dotenv/config";
import formData from "form-data";
import Mailgun from "mailgun.js";

// access mailgun account
const mailgun = new Mailgun(formData);
const client = mailgun.client({
  username: "api",
  key: process.env.API_KEY as string,
});

// defines types for items from hacker News API - https://github.com/HackerNews/API
type ItemType = 'job' | 'story' | 'comment' | 'poll' | 'pollopt'
type Item = {
  id: number
  type?: ItemType
  by?: string
  time?: number
  text?: string
  parent?: number
  poll?: number
  kids?: number[]
  url?: string
  score?: number
  title?: string
  descendants?: number
}

// fetch top 10 Hacker News posts
const fetchTopHNPosts = async (): Promise<Item[]> => {
    try {
      const response = await axios.get('https://hacker-news.firebaseio.com/v0/topstories.json')
      const topStoriesPromises = response.data.map((id: number) =>
        axios.get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
      )
      const posts = await Promise.all(topStoriesPromises)
      const postData: Item[] = posts.map((post: any) => post.data)
      return postData.sort((a, b) => (b.descendants || 0) - (a.descendants || 0)).slice(0, 10)
    } catch (error) {
      console.error('Error fetching Hacker News posts: ', error)
      return []
    }
  }

  // test it out
// fetchTopHNPosts().then((val) => console.log(val))


// create send email function and email template 
const sendEmail = async (posts: Item[]): Promise<void> => {
  const html: string = `
  <h1>Top 10 Hacker News Posts with Most Comments</h1>
  <ul>
    ${posts
      .map(
        (post: Item) =>
          `<li><a href=${post.url}>${post.title} - ${
            post.descendants || 0
          } comments</a></li>`
      )
      .join("")}
  </ul>
  `;
  const messageData = {
    from: `"HN News ☁️" <${process.env.EMAIL}>`,
    to: [process.env.RECIPIENT_EMAIL as string], // or array of emails
    subject: "Currently 🔥 on HN",
    html,
  };
  client.messages
    .create(process.env.DOMAIN as string, messageData)
    .then((res) => console.log("Email sent: ", res))
    .catch((err) => console.error("Error sending email: ", err));
};