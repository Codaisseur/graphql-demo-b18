// src/schema/movies.js
import { makeExecutableSchema } from 'graphql-tools'
import http from 'request-promise-json'

const MOVIE_DB_API_KEY = process.env.MOVIE_DB_API_KEY
const OMDB_API_KEY = process.env.OMDB_API_KEY

let guestSessionObj
async function getSessionId() {
  guestSessionObj =
    guestSessionObj ||
    (await http.get(
      `https://api.themoviedb.org/3/authentication/guest_session/new?api_key=${MOVIE_DB_API_KEY}&language=en-US`
    ))
  return guestSessionObj["guest_session_id"]
}

const typeDefs = `
  type Query {
    movies: [Movie]
    movie(id: ID, imdb_id: String): Movie
    search(q: String!): SearchResult
  }

  type Mutation {
    rateMovie(id: ID!, rating: Int!): Int
  }

  type Collection {
    id: ID!
    name: String
    poster_path: String
    backdrop_path: String
  }

  type Company {
    id: ID!
    name: String!
  }

  enum Currency {
    EUR
    GBP
    USD
  }

  interface Media {
    id: ID!
    title: String!
    media_type: String!
  }

  type Movie implements Media {
    id: ID!
    title: String!
    media_type: String!
    adult: Boolean
    backdrop_path: String
    belongs_to_collection: Collection
    budget(currency: Currency = EUR): Int
    homepage: String
    imdb_id: String
    overview: String
    popularity: Float
    production_companies: [Company]
    release_date: String
    revenue: Int
  }

  type TVShow implements Media {
    id: ID!
    title: String!
    media_type: String!
    running: Boolean
  }

  union SearchResult = Movie | TVShow | Company


`;

const resolvers = {
  Query: {
    movie: async (obj, args, context, info) => {
      if (args.id) {
        return http
          .get(`https://api.themoviedb.org/3/movie/${args.id}?api_key=${MOVIE_DB_API_KEY}&language=en-US`)
      }
      if (args.imdb_id) {
        const results = await http
          .get(`https://api.themoviedb.org/3/find/${args.imdb_id}?api_key=${MOVIE_DB_API_KEY}&language=en-US&external_source=imdb_id`)

        if (results.movie_results.length > 0) {
          const movieId = results.movie_results[0].id
          return http
            .get(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${MOVIE_DB_API_KEY}&language=en-US`)
        }
      }
    },
    movies: async (obj, args, context, info) => {
      const page = await http
        .get(`https://api.themoviedb.org/3/discover/movie/?api_key=${MOVIE_DB_API_KEY}&language=en-US&sort_by=popularity.desc`)
      return page.results
    },
  },
  Mutation: {
    rateMovie: async (obj, args, context, info) => {
      const guest_session = await getSessionId()

      const movie = await http.post(
        `https://api.themoviedb.org/3/movie/${
          args.id
        }/rating?api_key=${MOVIE_DB_API_KEY}&guest_session_id=${guest_session}&language=en-US`,
        {value: args.rating}
      )

      return args.rating
    }
  }
};

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

export default schema;
