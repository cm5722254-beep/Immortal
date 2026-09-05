-- Haskell Pure Functional Video Stream Validator
module StreamValidator where

data StreamQuality = SD | HD | Full_HD | 4K deriving (Show, Eq)

data StreamManifest = StreamManifest {
    manifestId   :: String,
    quality      :: StreamQuality,
    chunkCount   :: Int,
    isComplete   :: Bool
} deriving (Show)

validateManifest :: StreamManifest -> Either String String
validateManifest m
    | chunkCount m <= 0 = Left "[Haskell Error] Manifest must contain at least 1 chunk"
    | not (isComplete m) = Left "[Haskell Warning] Stream is currently live/incomplete"
    | otherwise = Right $ "[Haskell Verified] Manifest " ++ manifestId m ++ " is valid and ready to stream"
