process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
process.env.UV_THREADPOOL_SIZE = 128;

const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv/config');


const sequelize = new Sequelize(process.env.DATABASE, process.env.USER_DB, process.env.PASSWORD_DB, {
  host: process.env.HOST_DB,
  dialect: 'mysql',
  port: process.env.PORT_DB,
  define: {
    timestamps: false
  }
});


const main_numbers = sequelize.define('tbl_main_numbers', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true
  },
  number_principal: {
    type: DataTypes.STRING
  },
  country: {
    type: DataTypes.STRING
  },
  active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
});

main_numbers.sync();

let latestTitle = '';

const scrapeWebsite = async () => {
  try {
    const response = await axios.get(process.env.URL_WSCRAPING);
    const html = response.data;
    const $ = cheerio.load(html);
    // const newLatestTitle = $('.latest-added__title').text();
    const newLatestTitle = $('.sms-card__number a').text();
    const country = $('.sms-card').first().find('h4').text();

    const regex = /\+(\d+)/; // Expressão regular para encontrar o valor após o sinal de "+"
    const newMatch = newLatestTitle.match(regex);
    const newContentAfterPlus = newMatch && newMatch[1] ? newMatch[1] : '';

    if (newContentAfterPlus !== latestTitle) {
      latestTitle = newContentAfterPlus;

      // Verifica se o valor já existe no banco de dados
      const existingNumber = await main_numbers.findOne({
        where: { number_principal: latestTitle }
      });

      if (!existingNumber) {
        //console.log('Conteúdo atualizado:', latestTitle);

        const checkPostExists = async (title) => {
          try {
            const response = await axios.get(
                process.env.URL_WP + '/wp-json/wp/v2/posts',
                {
                  params: {
                    search: title,
                  },
                }
            );

            return response.data.length > 0;
          } catch (error) {
            console.error('Erro ao verificar a existência do post:', error);
            return false;
          }
        };

        const createPost = async (title, content) => {
          try {
            const postData = {
              title: title,
              content: content,
              status: 'publish',//publish/draft,
              comment_status: 'closed',
              ping_status: 'closed',
              categories: [3],
              tags: [67, 69, 66, 75, 53, 10, 71, 57, 63, 44, 78, 61, 45, 73, 8, 79, 19, 42, 40, 51, 50, 68, 48, 14, 54, 60, 31, 30, 58, 72, 7, 13, 32, 18, 6, 62, 11, 76, 49, 70, 41, 77, 74, 46, 43, 56, 52, 59, 47, 20, 21, 39, 65, 55, 64]
            };

            const response = await axios.post(
                process.env.URL_WP + '/wp-json/wp/v2/posts',
                postData,
                {
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: process.env.BEARER_TOKEN,
                  },
                }
            );

            //console.log('Post criado com sucesso:', response.data);
          } catch (error) {
            console.error('Erro ao criar o post:', error);
          }
        };

        const createPostIfNotExists = async (title, content) => {
          const postExists = await checkPostExists(title);

          if (postExists) {
            //console.log('Já existe um post com o mesmo título. O novo post não será criado.');
          } else {
            await createPost(title, content);
          }
        };

        const postTitle = newContentAfterPlus;
        const postContent = '</br> [xyz-ips snippet="lista-sms-data-table"] <br/>' +
            '<article class="content-seo-post mt-5">Receive SMS online Free. Your ultimate resource for receiving SMS online for free. Discover the most efficient methods and platforms to receive SMS online, explore the benefits of virtual numbers, and learn how to receive messages hassle-free. Find out how to maintain your privacy while enjoying the convenience of receiving SMS online. Join us as we delve into the world of virtual numbers and unlock the power of hassle-free communication. Explore our articles and tutorials to find the best solutions for receiving SMS online effortlessly. Get ready to receive SMS online and stay connected with our Blog of SIM!<p>&nbsp;</p><p>important questions</p><h4>Am I capable of utilizing Blog of SIM SMS to receive personal SMS?</h4><p>Certainly, you have the capability to receive various types of SMS messages.</p><h4>Can I avail myself of free SMS on Blog of SIM SMS in order to gain access to WhatsApp?</h4><p>Absolutely, you can create a WhatsApp account using the country code of your preference.</p><h4>Are the numbers usable worldwide, regardless of location?</h4><p>Absolutely. You can utilize any of the numbers showcased on our website from any part of the world, irrespective of the country code you select.</p><h4>How does Blog of SIM SMS operate?</h4><p>Blog of SIM SMS operates in an extremely user-friendly manner. Simply select the desired number and input it as if it were your own. Then, patiently wait for the SMS to appear on the screen.</p></article>';

        const postCountry = country;

        createPostIfNotExists(postTitle, postContent);

        // Cria um novo registro no banco de dados
        await main_numbers.create({ number_principal: latestTitle, country: postCountry, active: true });
      } else {
        //console.log('Valor já existe no banco de dados:', latestTitle);
      }
    } else {
      //console.log('Nenhuma alteração no conteúdo.');
    }
  } catch (error) {
    //console.log('Erro ao obter os dados da página:', error);
  }
};


cron.schedule(process.env.CRON_EXPRESSION, () => {
  scrapeWebsite();
});

scrapeWebsite();
