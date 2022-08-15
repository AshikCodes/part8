const { UserInputError, AuthenticationError } = require("apollo-server");
const { PubSub } = require("graphql-subscriptions");
const pubsub = new PubSub();

require("dotenv").config();
const Book = require("./models/Book");
const Author = require("./models/Author");
const User = require("./models/User");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

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
        const filteredBooks = Book.find({
          genres: { $in: args.genre },
        }).populate("author");
        console.log(`-------FILTERED BOOKS: ${filteredBooks}`);
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
      console.log("authentication is", context.currentUser);

      if (!context.currentUser) {
        throw new AuthenticationError("not authenticated");
      }

      try {
        await newBook.save();
      } catch (error) {
        console.log(`error hereererere: ${error.message}`);
        throw new UserInputError(error.message, {
          invalid: args,
        });
      }
      pubsub.publish("BOOK_ADDED", { bookAdded: newBook });
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

      return {
        value: jwt.sign(userToken, JWT_SECRET),
        favouriteGenre: user.favouriteGenre,
      };
    },
  },
  Subscription: {
    bookAdded: {
      subscribe: () => pubsub.asyncIterator("BOOK_ADDED"),
    },
  },
};

module.exports = resolvers;
