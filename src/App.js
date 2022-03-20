import * as React from 'react';

const API_ENDPOINT = 'https://hn.algolia.com/api/v1/search?query=';

const useSemiPersistentState = (key, initialState) => {
    const [value, setValue] = React.useState(
        localStorage.getItem(key) || initialState 
    );

    React.useEffect(() => {
        localStorage.setItem(key, value);
    }, [value, key]);

    return [value, setValue];
};

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
    const [searchTerm, setSearchTerm] = useSemiPersistentState(
        'search', 
        'React'
    );
    
    const [url, setUrl] = React.useState(
        `${API_ENDPOINT}${searchTerm}`
    );

    const handleSearchInput = (event) => {
        setSearchTerm(event.target.value);
    };

    const handleSearchSubmit = () => {
        setUrl(`${API_ENDPOINT}${searchTerm}`);
    };

    const [stories, dispatchStories] = React.useReducer(
        storiesReducer,
        {data: [], isLoading: false, isError: false } 
    );
   
    const handleFetchStories = React.useCallback(() => { 
        dispatchStories({type: fetchInit});
    
        fetch(url)
            .then((response) => response.json())
            .then((result) => {
                dispatchStories({
                    type: fetchSuccess, 
                    payload: result.hits,
                });
            })
            .catch(() => 
                dispatchStories({type: fetchFailure})
            );
    }, [url]);

    React.useEffect(() => {
        handleFetchStories();
    }, [handleFetchStories]);

    const handleRemoveStory = (item) => {
        dispatchStories({
            type: removeStory,
            payload: item,
        });
    };

    return (
        <div>
            <h1>My Hacker Stories</h1>

            <InputWithLabel
                id="search"
                value={searchTerm}
                isFocused
                onInputChange={handleSearchInput}
            >
                <strong>Search:</strong>
            </InputWithLabel>
           
            <button
                type="button"
                disabled={!searchTerm}
                onClick={handleSearchSubmit}
            >
                Submit
            </button>

            <hr />
            
            {stories.isError && <p>Somethin went wrong...</p>}

            {stories.isLoading ? (
                <p>Loading ...</p>
            ) : (
                <List 
                    list={stories.data} 
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
