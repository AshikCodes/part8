const { ApolloServer, gql } = require("apollo-server");
require("dotenv").config();
const Book = require("./models/Book");
const Author = require("./models/Author");
const mongoose = require("mongoose");
const { v4: uuid } = require("uuid");

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
  type Query {
    bookCount: Int!
    authorCount: Int!
    allBooks(author: String, genre: String): [Book]
    allAuthors: [Author!]!
  }
  type Mutation {
    addBook(
      title: String!
      published: Int!
      author: String!
      genres: [String!]!
    ): Book!
    editAuthor(name: String!, setBornTo: Int!): Author
  }
`;

const resolvers = {
  Query: {
    // bookCount: () => books.length,
    bookCount: async () => Book.collection.countDocuments(),
    authorCount: () => authors.length,
    allBooks: (root, args) => {
      console.log("args is", args.genre);
      if (args.author != null) {
        return books.filter((a) => a.author === args.author);
      } else if (args.genre != null) {
        return books.filter((a) => a.genres.includes(args.genre));
      } else {
        return books;
      }
    },
    allAuthors: () => {
      var count = 0;
      var authorBookCounts = new Array(authors.length);

      for (let i = 0; i < authors.length; i++) {
        for (let y = 0; y < books.length; y++) {
          if (books[y].author == authors[i].name) {
            count++;
          }
        }
        authorBookCounts[i] = count;
        count = 0;
      }

      for (let i = 0; i < authors.length; i++) {
        for (let i = 0; i < authors.length; i++) {
          authors[i].bookCount = authorBookCounts[i];
        }
      }
      return authors;
    },
  },
  Mutation: {
    addBook: async (root, args) => {
      const authorObj = await Author.findOne({ name: args.author });
      console.log("author here is", authorObj);
      const newBook = new Book({ ...args, author: authorObj });
      return newBook.save();
    },
    editAuthor: (root, args) => {
      console.log(`authors here is ${args.name}`);
      console.log(`args is ${args.setBornTo}`);
      console.log(`args is ${JSON.stringify(authors)}`);

      const authorEdited = authors.find((a) => a.name == args.name);

      if (authorEdited == null) {
        return null;
      }
      authorEdited.born = args.setBornTo;

      return authorEdited;
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`);
});
