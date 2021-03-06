import * as React from 'react';
import axios from 'axios';
import { sortBy } from 'lodash';
import './App.css';

type Story = {
    objectID: string;
    url: string;
    title: string;
    author: string;
    num_comments: number;
    points: number;
};

type Stories = Array<Story>;

const API_BASE = 'https://hn.algolia.com/api/v1';
const API_SEARCH = '/search';
const PARAM_SEARCH = 'query=';
const PARAM_PAGE = 'page=';

const useSemiPersistentState = (
    key: string, 
    initialState: string
): [string, (newValue: string) => void] => {
    const isMounted = React.useRef(false);

    const [value, setValue] = React.useState(
        localStorage.getItem(key) || initialState 
    );

    React.useEffect(() => {
        if (!isMounted.current) {
            isMounted.current = true;
        } else {
            localStorage.setItem(key, value);
        }
    }, [value, key]);

    return [value, setValue];
};

const removeStory = 'REMOVE_STORY';
const fetchInit   = 'STORIES_FETCH_INIT';
const fetchSuccess   = 'STORIES_FETCH_SUCCESS';
const fetchFailure   = 'STORIES_FETCH_FAILURE';

interface StoriesFetchInitAction {
    type: typeof fetchInit;
}

interface StoriesFetchSuccessAction {
    type: typeof fetchSuccess;
    payload: Stories;
    page: number;
}

interface StoriesFetchFailureAction {
    type: typeof fetchFailure;
}

interface StoriesRemoveAction {
    type: typeof removeStory;
    payload: Story;
}

type StoriesState = {
    data: Stories;
    isLoading: boolean;
    isError: boolean;
    page: number;
};

type StoriesAction =
    | StoriesFetchInitAction
    | StoriesFetchSuccessAction
    | StoriesFetchFailureAction
    | StoriesRemoveAction;

const storiesReducer = (
    state: StoriesState, 
    action: StoriesAction
) => {
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
                data: 
                    action.page === 0
                        ? action.payload : state.data.concat(action.payload), 
                page: action.page,
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
                data: state.data.filter(
                    (story) => action.payload.objectID !== story.objectID
                ),
            };
        default:
            throw new Error();
    }
};

const getSumComments = (
    stories: StoriesState 
) => {
    return stories.data.reduce(
        (result, value) => result + value.num_comments,
        0
    );
};

const getUrl = (searchTerm: string, page: number) => 
    `${API_BASE}${API_SEARCH}?${PARAM_SEARCH}${searchTerm}&${PARAM_PAGE}${page}`;

const extractSearchTerm = (url:string) => 
    url.substring(url.lastIndexOf('?') + 1, url.lastIndexOf('&'))
       .replace(PARAM_SEARCH, '');

const getLastSearches = (urls: Array<string>) => 
    urls
        .reduce((result: Array<string> , url, index) => {
            const searchTerm = extractSearchTerm(url);
            if (index === 0) {
                return result.concat(searchTerm);
            }

            const previousSearchTerm = result[result.length - 1];

            if (searchTerm === previousSearchTerm) {
                return result;
            } else {
                return result.concat(searchTerm);
            }
        }, [])
        .slice(-6)
        .slice(0, -1);

const App = () => {
    const [searchTerm, setSearchTerm] = useSemiPersistentState(
        'search', 
        'React'
    );
    
    const [urls, setUrls] = React.useState([getUrl(searchTerm, 0)]);

    const handleSearchInput = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        setSearchTerm(event.target.value);
    };

    const handleSearchSubmit = (
        event: React.FormEvent<HTMLFormElement>
    ) => {
        handleSearch(searchTerm, 0);
        event.preventDefault();
    };

    const [stories, dispatchStories] = React.useReducer(
        storiesReducer,
        {data: [], page: 0, isLoading: false, isError: false } 
    );
   
    const handleFetchStories = React.useCallback(async () => { 
        dispatchStories({type: fetchInit});
        
        try {
            const lastUrl = urls[urls.length - 1];
            const result = await axios.get(lastUrl);  
            dispatchStories({
                type: fetchSuccess, 
                payload: result.data.hits,
                page: result.data.page,
            });
        } catch {
            dispatchStories({type: fetchFailure});
        }
    }, [urls]);

    React.useEffect(() => {
        handleFetchStories();
    }, [handleFetchStories]);

    const handleRemoveStory = React.useCallback((item: Story) => {
        dispatchStories({
            type: removeStory,
            payload: item,
        });
    }, []);
    
    const sumComments = React.useMemo(() => getSumComments(stories), [stories]); 

    const handleLastSearch = (searchTerm: string) => {
        setSearchTerm(searchTerm);
        handleSearch(searchTerm, 0);
    };

    const handleSearch = (searchTerm: string, page: number) => {
        const url = getUrl(searchTerm, page);
        setUrls(urls.concat(url));
    };
    
    const lastSearches = getLastSearches(urls);

    const handleMore = () => {
        const lastUrl = urls[urls.length - 1];
        const searchTerm = extractSearchTerm(lastUrl);
        handleSearch(searchTerm, stories.page + 1);
    };

    return (
        <div className="container">
            <h1 className="header-primary">My Hacker Stories with {sumComments} comments.</h1>

            <SearchForm
                searchTerm={searchTerm}
                onSearchInput={handleSearchInput}
                onSearchSubmit={handleSearchSubmit}
            />
            
            <LastSearches
                lastSearches={lastSearches}
                onLastSearch={handleLastSearch}
            />
            
            {stories.isError && <p>Somethin went wrong...</p>}

            <List 
                list={stories.data} 
                onRemoveItem={handleRemoveStory} 
            />

            {stories.isLoading ? (
                <p>Loading ...</p>
            ) : (
                <button type="button" onClick={handleMore}>
                    More
                </button>
            )}
        </div>
    );
};


type LastSearchesProps = {
    lastSearches: Array<string>;
    onLastSearch: (searchTerm: string) => void;
};

const LastSearches = ({
    lastSearches,
    onLastSearch, 
}: LastSearchesProps) => (
    <>
        {lastSearches.map((searchTerm, index) => (
            <button
                key={searchTerm + index}
                type="button"
                onClick={() => onLastSearch(searchTerm)}
            >
                {searchTerm}
            </button>
        ))}
    </>
);

type SearchFormProps = {
    searchTerm: string;
    onSearchInput: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onSearchSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

const SearchForm = ({
    searchTerm,
    onSearchInput,
    onSearchSubmit,
}: SearchFormProps) => (
    <form onSubmit={onSearchSubmit} className="search-form">
        <InputWithLabel
            id="search"
            value={searchTerm}
            isFocused
            onInputChange={onSearchInput}
        >
            <strong>Search:</strong>
        </InputWithLabel>
        
        <button 
            type="submit" 
            disabled={!searchTerm}
            className="button button_large"
        >
            Submit
        </button>
    </form>
);        


type InputWithLabelProps = {
    id: string;
    value: string;
    type?: string;
    onInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    isFocused?: boolean;
    children: React.ReactNode;
};

const InputWithLabel = ({
    id,
    value, 
    type = 'text', 
    onInputChange, 
    isFocused, 
    children,
}: InputWithLabelProps) => {
    const inputRef = React.useRef<HTMLInputElement>(null!);

    React.useEffect(() => {
        if (isFocused && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isFocused]);
    
    return (
        <>
            <label htmlFor={id} className="label">
                {children}
            </label>
            &nbsp;
            <input
                ref={inputRef}
                id={id} 
                type={type}
                value={value} 
                autoFocus={isFocused}
                onChange={onInputChange}
                className="input"
            />
        </>
    );
};

interface sortsInfo {
    [key: string] : (list: Stories) => Stories,
};

const SORTS : sortsInfo  = {
    NONE: (list: Stories) => list,
    TITLE: (list: Stories) =>  sortBy(list, 'title'),
    AUTHOR: (list: Stories) => sortBy(list, 'author'),
    COMMENT: (list: Stories) => sortBy(list, 'num_comments').reverse(),
    POINT: (list: Stories) => sortBy(list, 'points').reverse(),
};

type ListProps = {
    list: Stories;
    onRemoveItem: (item: Story) => void;
};

const List = React.memo(
    ({list, onRemoveItem}: ListProps) => {
        
    const [sort, setSort] = React.useState({
        sortKey: 'NONE',
        isReverse: false,
    });

    const handleSort = (sortKey: string) => {
        const isReverse = sort.sortKey === sortKey && !sort.isReverse;
        setSort({sortKey, isReverse});
    }; 
    
    const sortFunction = SORTS[sort.sortKey];
    const sortedList = sort.isReverse ? sortFunction(list).reverse() : sortFunction(list);

    return (
        <ul>
            <li style={{ display: 'flex' }}>
                <span style={{ width: '40%' }}>
                    <button type="button" onClick={() => handleSort('TITLE')}>
                        Title
                    </button>
                </span>
                <span style={{ width: '30%' }}>
                    <button type="button" onClick={() => handleSort('AUTHOR')}>
                        Author    
                    </button>
                </span>
                <span style={{ width: '10%' }}>
                    <button type="button" onClick={() => handleSort('COMMENT')}>
                        Comments    
                    </button>
                </span>
                <span style={{ width: '10%' }}>
                    <button type="button" onClick={() => handleSort('POINT')}>
                        Points    
                    </button>
                </span>
                <span style={{ width: '10%' }}>Actions</span>
            </li>

            {sortedList.map((item: Story) => 
                <Item 
                    key={item.objectID} 
                    item={item}
                    onRemoveItem={onRemoveItem}
                /> 
            )}
        </ul>
    );
    }
);

type ItemProps = {
    item: Story;
    onRemoveItem: (item: Story) => void;
};

const Item = ({
    item, 
    onRemoveItem,
}: ItemProps) => {
    const handleRemoveItem = () => {
        onRemoveItem(item);
    };
    
    return (
        <li className="item">
            <span style={{ width: '40%' }}>
                <a href={item.url}>{item.title}</a>
            </span>
            <span style={{ width: '30%' }}>{item.author}</span>
            <span style={{ width: '10%' }}>{item.num_comments}</span>
            <span style={{ width: '10%' }}>{item.points}</span>
            <span style={{ width: '10%' }}>
                <button 
                    type="button" 
                    onClick={handleRemoveItem}
                    className="button button_small"
                >
                    Dismiss
                </button>
            </span>
        </li>
    );
};

export default App;
export { storiesReducer, SearchForm, InputWithLabel, List, Item };
