import * as React from 'react';

const useSemiPersistentState = (key, initialState) => {
    const [value, setValue] = React.useState(
        localStorage.getItem(key) || initialState 
    );

    React.useEffect(() => {
        localStorage.setItem(key, value);
    }, [value, key]);

    return [value, setValue];
};

const initialStories = [
    {
        title: 'React',
        url: 'https://reactjs.org/',
        author: 'Jordan walk',
        num_comments: 3,
        points: 4,
        objectID: 0,
    },
    {
        title: 'Redux',
        url: 'https://redux.js.org/',
        author: 'Dan Abramov, Andrew Clark',
        num_comments: 2,
        points: 5,
        objectID:1,
    },
];

const getAsyncStories = () =>
    new Promise((resolve) =>
        setTimeout(
            () => resolve({data: {stories: initialStories }}),
            2000
        )
    );

const removeStory = 'REMOVE_STORY';
const fetchInit   = 'STORIES_FETCH_INIT';
const fetchSuccess   = 'STORIES_FETCH_SUCCESS';
const fetchFailure   = 'STORIES_FETCH_FAILURE';

const storiesReducer = (state, action) => {
    switch (action.type) {
        case fetchInit:
            return {
                ...state,
                isLoading: true,
                isError: false,
            };
        case fetchSuccess:
            return {
                ...state,
                isLoading: false,
                isError: false,
                data: action.payload,
            };
        case fetchFailure:
            return {
                ...state,
                isLoading: false,
                isError: true,
            };
        case removeStory:
            return {
                ...state,
                date: state.filter(
                    (story) => action.payload.objectID !== story.objectID
                ),
            };
        default:
            throw new Error();
    }
};

const App = () => {
    const [searchTerm, setSearchTerm] = useSemiPersistentState('search', 'React');
    const [stories, dispatchStories] = React.useReducer(
        storiesReducer,
        {data: [], isLoading: false, isError: false } 
    );
    
    React.useEffect(() => {
        dispatchStories({type: fetchInit});

        getAsyncStories()
            .then(result => {
                dispatchStories({
                    type: fetchSuccess,
                    payload: result.data.stories,
                });
                dispatchStories({
                    type: fetchSuccess, 
                    payload: result.data.stories,
                });
            })
            .catch(() => 
                dispatchStories({type: fetchFailure})
            );
    }, []);

    const handleRemoveStory = (item) => {
        dispatchStories({
            type: removeStory,
            payload: item,
        });
    };

    const handleSearch = (event) => {
        setSearchTerm(event.target.value);
    };

    const searchedStories = stories.data.filter((story) => 
        story.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <h1>My Hacker Stories</h1>

            <InputWithLabel
                id="search"
                value={searchTerm}
                isFocused
                onInputChange={handleSearch}
            >
                <strong>Search:</strong>
            </InputWithLabel>
            
            <hr />
            
            {stories.isError && <p>Somethin went wrong...</p>}

            {stories.isLoading ? (
                <p>Loading ...</p>
            ) : (
                <List 
                    list={searchedStories} 
                    onRemoveItem={handleRemoveStory} 
                />
            )}
        </div>
    );
}

const InputWithLabel = ({
    id,
    value, 
    type = 'text', 
    onInputChange, 
    isFocused, 
    children,
}) => {
    const inputRef = React.useRef();

    React.useEffect(() => {
        if (isFocused && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isFocused]);
    
    return (
        <>
            <label htmlFor={id}>{children}</label>
            &nbsp;
            <input
                ref={inputRef}
                id={id} 
                type={type}
                value={value} 
                autoFocus={isFocused}
                onChange={onInputChange} 
            />
        </>
    );
};

const List = ({list, onRemoveItem }) => ( 
    <ul>
        {list.map((item) => 
            <Item 
                key={item.ObjectID} 
                item={item}
                onRemoveItem={onRemoveItem}
            /> 
        )}
    </ul>
);

const Item = ({item, onRemoveItem}) => {
    const handleRemoveItem = () => {
        onRemoveItem(item);
    };
    
    return (
        <li>
            <span>
                <a href={item.url}>{item.title}</a>
            </span>
            <span>{item.author}</span>
            <span>{item.num_comments}</span>
            <span>{item.points}</span>
            <span>
                <button type="button" onClick={handleRemoveItem}>
                    Dismiss
                </button>
            </span>
        </li>
    );
};

export default App;
