const {
  ApolloServer,
  gql,
  UserInputError,
  AuthenticationError,
} = require("apollo-server");
require("dotenv").config();
const Book = require("./models/Book");
const Author = require("./models/Author");
const User = require("./models/User");
const mongoose = require("mongoose");
const { v4: uuid } = require("uuid");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

var fs = require("fs");

const uri = process.env.MONGODB_URI;

console.log("connecting to", uri);

//Connecting to MongoDB
mongoose
  .connect(uri)
  .then(() => {
    console.log("connected to db!");
  })
  .catch((error) => {
    console.log("error while connecting to db", error);
  });

let authors;
var updatedAuthorFile = "/Users/ashikreji/part8/updatedAuthors.js";

if (fs.existsSync(updatedAuthorFile)) {
  var updatedAuthors = require(updatedAuthorFile);
  console.log(`updatedAuthors is ${updatedAuthors}`);
  console.log(`updatedAuthors: ${updatedAuthors.length} authors`);
  authors = updatedAuthors;
} else {
  console.log("nothing for authors");
  authors = [
    {
      name: "Robert Martin",
      id: "afa51ab0-344d-11e9-a414-719c6709cf3e",
      born: 1952,
    },
    {
      name: "Martin Fowler",
      id: "afa5b6f0-344d-11e9-a414-719c6709cf3e",
      born: 1963,
    },
    {
      name: "Fyodor Dostoevsky",
      id: "afa5b6f1-344d-11e9-a414-719c6709cf3e",
      born: 1821,
    },
    {
      name: "Joshua Kerievsky", // birthyear not known
      id: "afa5b6f2-344d-11e9-a414-719c6709cf3e",
    },
    {
      name: "Sandi Metz", // birthyear not known
      id: "afa5b6f3-344d-11e9-a414-719c6709cf3e",
    },
  ];
}

/*
 * Suomi:
 * Saattaisi olla järkevämpää assosioida kirja ja sen tekijä tallettamalla kirjan yhteyteen tekijän nimen sijaan tekijän id
 * Yksinkertaisuuden vuoksi tallennamme kuitenkin kirjan yhteyteen tekijän nimen
 *
 * English:
 * It might make more sense to associate a book with its author by storing the author's id in the context of the book instead of the author's name
 * However, for simplicity, we will store the author's name in connection with the book
 */

//Writing to a new file
let books;
var updatedBookFile = "/Users/ashikreji/part8/updatedBooks.js";

if (fs.existsSync(updatedBookFile)) {
  var updatedBooks = require(updatedBookFile);
  console.log(`updatedBooks is ${updatedBooks}`);
  console.log(`updatedBooks: ${updatedBooks.length} books`);
  books = updatedBooks;
} else {
  console.log("nothing");
  books = [
    {
      title: "Clean Code",
      published: 2008,
      author: "Robert Martin",
      id: "afa5b6f4-344d-11e9-a414-719c6709cf3e",
      genres: ["refactoring"],
    },
    {
      title: "Agile software development",
      published: 2002,
      author: "Robert Martin",
      id: "afa5b6f5-344d-11e9-a414-719c6709cf3e",
      genres: ["agile", "patterns", "design"],
    },
    {
      title: "Refactoring, edition 2",
      published: 2018,
      author: "Martin Fowler",
      id: "afa5de00-344d-11e9-a414-719c6709cf3e",
      genres: ["refactoring"],
    },
    {
      title: "Refactoring to patterns",
      published: 2008,
      author: "Joshua Kerievsky",
      id: "afa5de01-344d-11e9-a414-719c6709cf3e",
      genres: ["refactoring", "patterns"],
    },
    {
      title: "Practical Object-Oriented Design, An Agile Primer Using Ruby",
      published: 2012,
      author: "Sandi Metz",
      id: "afa5de02-344d-11e9-a414-719c6709cf3e",
      genres: ["refactoring", "design"],
    },
    {
      title: "Crime and punishment",
      published: 1866,
      author: "Fyodor Dostoevsky",
      id: "afa5de03-344d-11e9-a414-719c6709cf3e",
      genres: ["classic", "crime"],
    },
    {
      title: "The Demon ",
      published: 1872,
      author: "Fyodor Dostoevsky",
      id: "afa5de04-344d-11e9-a414-719c6709cf3e",
      genres: ["classic", "revolution"],
    },
  ];
}
//Writing to a new file

const typeDefs = gql`
  type Book {
    title: String!
    published: Int!
    author: Author!
    id: String!
    genres: [String!]!
  }
  type Author {
    name: String!
    id: String!
    born: Int
    bookCount: Int
  }
  type User {
    username: String!
    favouriteGenre: String!
    id: ID!
  }
  type Token {
    value: String!
  }
  type Query {
    bookCount: Int!
    authorCount: Int!
    allBooks(author: String, genre: String): [Book]
    allAuthors: [Author!]!
    me: User
  }
  type Mutation {
    addBook(
      title: String!
      published: Int!
      author: String!
      genres: [String!]!
    ): Book!
    editAuthor(name: String!, setBornTo: Int!): Author
    createUser(username: String!, favouriteGenre: String!): User
    login(username: String!, password: String!): Token
  }
`;

const resolvers = {
  Query: {
    bookCount: async () => Book.collection.countDocuments(),
    authorCount: () => Author.collection.countDocuments(),
    allBooks: async (root, args) => {
      if (args.author && args.genre) {
        const authorObj = await Author.findOne({ name: args.author });
        console.log(authorObj);
        return Book.find({
          $and: [
            { author: { $in: authorObj._id } },
            { genres: { $in: args.genre } },
          ],
        }).populate("author");
      } else if (args.author) {
        const authorObj = await Author.findOne({ name: args.author });
        return Book.find({ author: { $in: authorObj._id } }).populate("author");
      } else if (args.genre) {
        return Book.find({ genres: { $in: args.genre } }).populate("author");
      }
      return Book.find({}).populate("author");
    },
    allAuthors: async () => {
      return Author.find({});
    },
    me: (root, args, context) => {
      return context.currentUser;
    },
  },
  Mutation: {
    addBook: async (root, args, context) => {
      const authorObj = await Author.findOne({ name: args.author });
      console.log("author here is", authorObj);
      const newBook = new Book({ ...args, author: authorObj });
      console.log("authentication is", context);

      if (!context.currentUser) {
        throw new AuthenticationError("not authenticated");
      }

      try {
        await newBook.save();
      } catch (error) {
        throw new UserInputError(error.message, {
          invalid: args,
        });
      }
      return newBook;
    },
    editAuthor: async (root, args, context) => {
      const author = await Author.findOne({ name: args.name });

      if (!context.currentUser) {
        throw new AuthenticationError("not authenticated");
      }

      if (!author) {
        const newAuthor = new Author({ name: args.name, born: args.setBornTo });
        try {
          await newAuthor.save();
        } catch (error) {
          throw new UserInputError(error.message, {
            invalid: args,
          });
        }
        return newAuthor;
      }
      return Author.findOneAndUpdate(
        { name: args.name },
        { born: args.setBornTo }
      );
    },
    createUser: async (root, args) => {
      const user = new User({
        username: args.username,
        favouriteGenre: args.favouriteGenre,
      });
      try {
        await user.save();
      } catch (error) {
        throw new UserInputError(error.message, {
          invalid: args,
        });
      }
      return user;
    },
    login: async (root, args) => {
      const user = await User.findOne({ username: args.username });

      if (!user || args.password !== "secret") {
        console.log("nopewfe", user);
        throw new UserInputError("wrong credentials");
      }

      const userToken = {
        username: user.username,
        id: user._id,
      };

      console.log("user token here is", userToken);

      return { value: jwt.sign(userToken, JWT_SECRET) };
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    const auth = req ? req.headers.authorization : null;
    if (auth && auth.toLowerCase().startsWith("bearer ")) {
      const decodedToken = jwt.verify(auth.substring(7), JWT_SECRET);
      const currentUser = await User.findById(decodedToken.id);
      console.log(`got here ${JSON.stringify(decodedToken)}`);
      return { currentUser };
    }
  },
});

server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`);
});
